import { ApiError } from '@/lib/api/errors';
import { checkQuota, getDomain, getExtension, getFilename, getMimetype } from '@/lib/api/upload';
import { bytes } from '@/lib/bytes';
import { COMPRESS_TYPES, compressFile, CompressResult } from '@/lib/compress';
import { config } from '@/lib/config';
import { hashPassword } from '@/lib/crypto';
import { datasource } from '@/lib/datasource';
import { prisma } from '@/lib/db';
import { fileSelect } from '@/lib/db/models/file';
import { sanitizeFilename } from '@/lib/fs';
import { removeGps } from '@/lib/gps';
import { log } from '@/lib/logger';
import { parserMetrics } from '@/lib/parser/metrics';
import type { CustomFormatOptions } from '@/lib/uploader/formatFileName';
import { runThumbnailWorkers } from '@/lib/tasks/run/thumbnails';
import { parseHeaders, UploadHeaders } from '@/lib/uploader/parseHeaders';
import { onUpload } from '@/lib/webhooks';
import { Prisma } from '@/prisma/client';
import { userMiddleware } from '@/server/middleware/user';
import typedPlugin from '@/server/typedPlugin';
import { SavedMultipartFile } from '@fastify/multipart';
import { stat } from 'fs/promises';
import { z } from 'zod';

export type ApiUploadResponse = {
  files: {
    id: string;
    name: string;
    type: string;
    url: string;
    pending?: boolean;
    removedGps?: boolean;
    compressed?: CompressResult;
  }[];

  deletesAt?: string;
  assumedMimetypes?: boolean[];
};

const logger = log('api').c('upload');

export const PATH = '/api/upload';
export default typedPlugin(
  async (server) => {
    const rateLimit = server.rateLimit
      ? server.rateLimit()
      : (_req: any, _res: any, next: () => any) => next();

    server.post<{
      Headers: UploadHeaders;
    }>(
      PATH,
      {
        preHandler: [userMiddleware, rateLimit],
        schema: {
          description:
            'Upload one or more files for the authenticated user, applying quota, folder, and upload option restrictions.',
          consumes: ['multipart/form-data'],
          response: {
            200: z.union([
              z.string().describe('if the noJson option is true, returns a comma-separated list of URLs'),
              z.object({
                files: z.array(
                  z.object({
                    id: z.string(),
                    name: z.string(),
                    type: z.string(),
                    url: z.string(),
                    pending: z.boolean().optional(),
                    removedGps: z.boolean().optional(),
                    compressed: z
                      .object({
                        mimetype: z.string(),
                        ext: z.enum(COMPRESS_TYPES),
                        failed: z.boolean().optional(),
                      })
                      .optional(),
                  }),
                ),
                deletesAt: z.string().optional(),
                assumedMimetypes: z.array(z.boolean()).optional(),
              }),
            ]),
          },
          tags: ['auth'],
        },
      },
      async (req, res) => {
        const options = parseHeaders(req.headers, config.files);

        if (options.partial) throw new ApiError(1001, 'bad options, receieved: partial upload');

        let folder = null;
        if (options.folder) {
          folder = await prisma.folder.findFirst({
            where: {
              id: options.folder,
            },
          });
          if (!folder) throw new ApiError(4001);
          if (!req.user && !folder.allowUploads) throw new ApiError(3002);
        }

        let files: SavedMultipartFile[] = [];
        try {
          files = await req.saveRequestFiles({ tmpdir: config.core.tempDirectory });
        } catch (e) {
          logger.warn('error parsing multipart/form-data request', {
            error: e instanceof Error ? e.message : e,
          });

          if (e instanceof Error && e.message.startsWith('Multipart:')) throw new ApiError(1061);
        }

        if (!files.length) throw new ApiError(1062);

        const totalFileSize = files.reduce((acc, x) => acc + x.file.bytesRead, 0);
        const quotaCheck = await checkQuota(req.user, totalFileSize, files.length);
        if (quotaCheck !== true)
          throw new ApiError(5002, typeof quotaCheck === 'string' ? quotaCheck : undefined);

        const response: ApiUploadResponse = {
          files: [],
          ...(options.deletesAt && {
            deletesAt: options.deletesAt === 'never' ? 'never' : options.deletesAt.toISOString(),
          }),
          ...(config.files.assumeMimetypes && { assumedMimetypes: Array(req.files.length) }),
        };

        const domain = getDomain(
          options.overrides?.returnDomain,
          config.core.defaultDomain,
          req.headers.host,
        );

        const metrics =
          options.format === 'custom' && req.user?.id != null ? await parserMetrics(req.user.id) : null;

        logger.debug('uploading files', { files: files.map((x) => x.filename) });

        for (let i = 0; i !== files.length; ++i) {
          const file = files[i];
          const extension = getExtension(file.filename, options.overrides?.extension);

          if (config.files.disabledExtensions.includes(extension))
            throw new ApiError(1006, `file[${i}]: File extension ${extension} is not allowed`);
          if (file.file.bytesRead > bytes(config.files.maxFileSize))
            throw new ApiError(
              5001,
              `file[${i}]: File size is too large. Maximum file size is ${bytes(config.files.maxFileSize)} bytes`,
            );

          // determine filename
          const format = options.format || config.files.defaultFormat;
          const customFormatOptions =
            format === 'custom'
              ? ({
                  customFormat: options.customFormat || config.files.customFormat,
                  user: req.user ?? {
                    id: 'anonymous',
                    username: 'anonymous',
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    role: 'USER',
                  },
                  file: {
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    originalName: file.filename,
                    name: file.filename,
                    size: file.file.bytesRead,
                    type: file.mimetype,
                    deletesAt: options.deletesAt && options.deletesAt !== 'never' ? options.deletesAt : null,
                    favorite: false,
                    folderId: options.folder ?? null,
                    views: 0,
                    anonymous: !req.user && options.folder ? true : false,
                    id: 'no-id-yet',
                    thumbnail: null,
                    maxViews: options.maxViews ?? null,
                  },
                  metrics,
                } satisfies CustomFormatOptions)
              : undefined;
          const nameResult = await getFilename(
            format,
            file.filename,
            extension,
            options.overrides?.filename,
            customFormatOptions,
          );
          if ('error' in nameResult) throw new ApiError(1009, `file[${i}]: ${nameResult.error}`);

          const { fileName } = nameResult;

          // determine mimetype
          const { mimetype, assumed } = await getMimetype(file.mimetype, extension);

          if (config.files.assumeMimetypes) {
            response.assumedMimetypes![i] = assumed;

            if (!assumed) {
              logger.warn(`file[${i}]: mimetype ${file.mimetype} was not recognized`);

              throw new ApiError(
                1010,
                `file[${i}]: mimetype ${file.mimetype} was not recognized, supply a valid mimetype`,
              );
            }
          }

          // compress the image if requested
          let compressed;
          if (mimetype.startsWith('image/') && options.imageCompression) {
            compressed = await compressFile(file.filepath, {
              quality: options.imageCompression.percent,
              type: options.imageCompression.type,
            });

            if (compressed.failed) {
              compressed = undefined;
              logger.warn('failed to compress file, using original.');
            } else {
              logger.c('compress').debug(`compressed file ${file.filename}`);
            }
          }

          // remove gps metadata if requested
          let removedGps = false;
          if (mimetype.startsWith('image/') && config.files.removeGpsMetadata) {
            const removed = removeGps(file.filepath);
            if (removed) logger.c('gps').debug(`removed gps metadata from ${file.filename}`);

            removedGps = removed;
          }

          const tempFileStats = await stat(file.filepath);

          const data: Prisma.FileCreateInput = {
            name: `${fileName}${compressed ? '.' + compressed.ext : extension}`,
            size: compressed?.buffer?.length ?? tempFileStats.size,
            type: compressed?.mimetype ?? mimetype,
            User: { connect: { id: req.user ? req.user.id : options.folder ? folder?.userId : undefined } },
          };

          if (!req.user && folder) data.anonymous = true;

          if (options.maxViews) data.maxViews = options.maxViews;
          if (options.password) data.password = await hashPassword(options.password);
          if (folder) data.Folder = { connect: { id: folder.id } };
          if (options.addOriginalName) {
            const sanitizedOG = sanitizeFilename(file.filename);
            if (!sanitizedOG) throw new ApiError(1008, `file[${i}]: Invalid characters in original filename`);

            data.originalName = sanitizedOG;
          }

          data.deletesAt = options.deletesAt && options.deletesAt !== 'never' ? options.deletesAt : null;

          const fileUpload = await prisma.file.create({
            data,
            select: fileSelect,
          });

          await datasource.put(fileUpload.name, compressed?.buffer ?? file.filepath, {
            mimetype: fileUpload.type,
          });

          const responseUrl = `${domain}${config.files.route === '/' || config.files.route === '' ? '' : `${config.files.route}`}/${fileUpload.name}`;

          response.files.push({
            id: fileUpload.id,
            name: fileUpload.name,
            type: fileUpload.type,
            url: encodeURI(responseUrl),
            removedGps: removedGps || undefined,
            compressed: compressed || undefined,
          });

          logger.info(
            `${req.user ? req.user.username : '[anonymous folder upload]'} uploaded ${fileUpload.name}`,
            { size: bytes(compressed?.buffer?.length ?? fileUpload.size), ip: req.ip },
          );

          await onUpload(config, {
            user: req.user ?? {
              id: 'anonymous',
              username: 'anonymous',
              createdAt: new Date(),
              updatedAt: new Date(),
              role: 'USER',
            },
            file: fileUpload,
            link: {
              raw: `${domain}/raw/${encodeURIComponent(fileUpload.name)}`,
              returned: encodeURI(responseUrl),
            },
          });
        }

        if (options.noJson)
          return res
            .status(200)
            .type('text/plain')
            .send(response.files.map((x) => x.url).join(','));

        if (config.features.thumbnails.instantaneous) {
          logger.debug('running thumbnail workers immediately due to configuration', {
            files: response.files.length,
          });

          const fileIds = response.files.map((x) => x.id);

          const thumbnailWorkers = server.tasks.workersBy('thumbnail');
          if (!thumbnailWorkers.length) return;

          runThumbnailWorkers(thumbnailWorkers, fileIds);
        }

        return res.send(response);
      },
    );
  },
  { name: PATH },
);
