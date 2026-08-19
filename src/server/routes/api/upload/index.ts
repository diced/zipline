import { ApiError } from '@/lib/api/errors';
import {
  checkQuota,
  enforceMimetypePolicy,
  getDomain,
  getExtension,
  getFilename,
  resolveUploadMimetype,
} from '@/lib/api/upload';
import { bytes } from '@/lib/bytes';
import { COMPRESS_TYPES, compressFile, CompressResult } from '@/lib/compress';
import { config } from '@/lib/config';
import { hashPassword } from '@/lib/crypto';
import { datasource } from '@/lib/datasource';
import { db } from '@/lib/db';
import { createFileHydrated, type FileInsert, lockFileOwner } from '@/lib/db/models/file';
import { findFolderRowById } from '@/lib/db/models/folder';
import { findFullUserById } from '@/lib/db/models/user';
import { sanitizeFilename } from '@/lib/fs';
import { removeGps } from '@/lib/gps';
import { log } from '@/lib/logger';
import { mapConcurrent } from '@/lib/mapConcurrent';
import { runThumbnailWorkers } from '@/lib/tasks/run/thumbnails';
import { parseHeaders, UploadHeaders } from '@/lib/uploader/parseHeaders';
import { onUpload } from '@/lib/webhooks';
import { userMiddleware } from '@/server/middleware/user';
import typedPlugin from '@/server/typedPlugin';
import { SavedMultipartFile } from '@fastify/multipart';
import { z } from 'zod';

export type ApiUploadResponse = {
  files: {
    id: string;
    name: string;
    type: string;
    url: string;
    pending?: boolean;
    removedGps?: boolean;
    compressed?: Omit<CompressResult, 'buffer'>;
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
          folder = await findFolderRowById(options.folder);
          if (!folder) throw new ApiError(4001);

          const ownsFolder = req.user ? folder.userId === req.user.id : false;
          if (!ownsFolder && !folder.allowUploads) throw new ApiError(req.user ? 3011 : 3002);
        }

        let files: SavedMultipartFile[] = [];
        try {
          const res = await req.saveRequestFiles({ tmpdir: config.core.tempDirectory });

          files = res.files;
        } catch (e) {
          logger.warn('error parsing multipart/form-data request', {
            error: e instanceof Error ? e.message : e,
          });

          if (e instanceof Error && e.message.startsWith('Multipart:')) throw new ApiError(1061);
        }

        if (!files.length) throw new ApiError(1062);

        const totalFileSize = files.reduce((acc, x) => acc + x.file.bytesRead, 0);

        // use quota of user if anonymous
        const quotaUser = req.user ? req.user : folder?.userId ? await findFullUserById(folder.userId) : null;

        const quotaCheck = await checkQuota(quotaUser, totalFileSize, files.length);
        if (quotaCheck !== true)
          throw new ApiError(5002, typeof quotaCheck === 'string' ? quotaCheck : undefined);

        const response: ApiUploadResponse = {
          files: [],
          ...(options.deletesAt && {
            deletesAt: options.deletesAt === 'never' ? 'never' : options.deletesAt.toISOString(),
          }),
          ...(config.files.assumeMimetypes && { assumedMimetypes: Array(files.length) }),
        };

        const domain = getDomain(
          options.overrides?.returnDomain,
          config.core.defaultDomain,
          req.headers.host,
        );

        logger.debug('uploading files', { files: files.map((x) => x.filename) });

        const reservedNames = new Set<string>();
        const format = options.format || config.files.defaultFormat;
        const filesBefore: {
          file: SavedMultipartFile;
          fileName: string;
          extension: string;
          mimetype: string;
          originalName?: string;
        }[] = [];

        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const extension = getExtension(file.filename, options.overrides?.extension);

          if (config.files.disabledExtensions.includes(extension))
            throw new ApiError(1006, `file[${i}]: File extension ${extension} is not allowed`);
          if (file.file.bytesRead > bytes(config.files.maxFileSize))
            throw new ApiError(
              5001,
              `file[${i}]: File size is too large. Maximum file size is ${bytes(config.files.maxFileSize)} bytes`,
            );

          // determine mimetype
          const { assumed, mimetype } = await resolveUploadMimetype(file.mimetype, extension, `file[${i}]`);

          if (config.files.assumeMimetypes) response.assumedMimetypes![i] = assumed;

          const cmpExt =
            mimetype.startsWith('image/') && options.imageCompression
              ? `.${options.imageCompression.type === 'jpeg' ? 'jpg' : (options.imageCompression.type ?? 'jpg')}`
              : null;
          let fileName: string;
          try {
            fileName = await getFilename(
              format,
              file.filename,
              extension,
              options.overrides?.filename,
              reservedNames,
              cmpExt && cmpExt !== extension ? [cmpExt] : [],
            );
          } catch (error) {
            throw new ApiError(1009, `file[${i}]: ${String(error)}`);
          }

          let originalName: string | undefined;
          if (options.addOriginalName) {
            try {
              originalName = sanitizeFilename(file.filename) ?? undefined;
            } catch {
              originalName = undefined;
            }

            if (!originalName)
              throw new ApiError(1008, `file[${i}]: Invalid characters in original filename`);
          }

          filesBefore.push({
            file,
            fileName,
            extension,
            mimetype,
            originalName,
          });
        }

        // todo: maybe make configurable?
        const prepared = await mapConcurrent(filesBefore, 4, async (item, i) => {
          const { file, fileName, extension, mimetype, originalName } = item;

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
            const removed = removeGps(compressed?.buffer ?? file.filepath);
            if (removed) logger.c('gps').debug(`removed gps metadata from ${file.filename}`);

            removedGps = removed;
          }

          const storedMimetype = enforceMimetypePolicy(
            compressed?.mimetype ?? mimetype,
            `file[${i}]`,
          ).mimetype;

          return {
            file,
            fileName,
            extension: compressed ? `.${compressed.ext}` : extension,
            mimetype: storedMimetype,
            size: compressed?.buffer.length ?? file.file.bytesRead,
            compressed,
            removedGps,
            originalName,
          };
        });

        const password = options.password ? await hashPassword(options.password) : undefined;
        const uploads = prepared.map((item) => {
          const { file, fileName, extension, mimetype, size, compressed, removedGps, originalName } = item;

          const data: FileInsert = {
            name: `${fileName}${extension}`,
            size,
            type: mimetype,
            userId: req.user ? req.user.id : options.folder ? folder?.userId : undefined,
          };

          if (!req.user && folder) data.anonymous = true;

          if (options.maxViews) data.maxViews = options.maxViews;
          if (password) data.password = password;
          if (folder) data.folderId = folder.id;
          if (originalName) data.originalName = originalName;

          data.deletesAt = options.deletesAt && options.deletesAt !== 'never' ? options.deletesAt : null;

          return { compressed, data, extension, file, removedGps, size };
        });

        const fileUploads = await db.transaction(async (tx) => {
          if (quotaUser?.quota) {
            await lockFileOwner(quotaUser.id, tx);

            const quotaCheck = await checkQuota(
              quotaUser,
              uploads.reduce((total, upload) => total + upload.size, 0),
              uploads.length,
              tx,
            );
            if (quotaCheck !== true)
              throw new ApiError(5002, typeof quotaCheck === 'string' ? quotaCheck : undefined);
          }

          const created = [];
          for (const upload of uploads) {
            created.push(await createFileHydrated(upload.data, { thumbnail: true, tags: true }, tx));
          }

          return created;
        });

        response.files = await mapConcurrent(uploads, 4, async (upload, uploadIndex) => {
          const { compressed, extension, file, removedGps } = upload;
          const fileUpload = fileUploads[uploadIndex];

          const storageData = compressed?.buffer ?? file.filepath;
          await datasource.put(fileUpload.name, storageData, {
            mimetype: fileUpload.type,
          });
          if (typeof storageData === 'string' && datasource.name === 'local' && req.tmpUploads) {
            req.tmpUploads = req.tmpUploads.filter((path) => path !== storageData);
          }

          const urlPath =
            options.extensionless && config.files.extensionlessUrls
              ? fileUpload.name.slice(0, -extension.length)
              : fileUpload.name;

          const responseUrl = `${domain}${config.files.route === '/' || config.files.route === '' ? '' : `${config.files.route}`}/${urlPath}`;

          const compressedResponse = compressed
            ? { mimetype: compressed.mimetype, ext: compressed.ext, failed: compressed.failed }
            : undefined;

          const responseFile = {
            id: fileUpload.id,
            name: fileUpload.name,
            type: fileUpload.type,
            url: encodeURI(responseUrl),
            removedGps: removedGps || undefined,
            compressed: compressedResponse,
          };

          logger.info(
            `${req.user ? req.user.username : '[anonymous folder upload]'} uploaded ${fileUpload.name}`,
            { size: bytes(fileUpload.size), ip: req.ip },
          );

          onUpload(config, {
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

          return responseFile;
        });

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
          if (thumbnailWorkers.length) runThumbnailWorkers(thumbnailWorkers, fileIds);
        }

        return res.send(response);
      },
    );
  },
  { name: PATH },
);
