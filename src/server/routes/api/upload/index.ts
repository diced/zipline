import { checkQuota, getDomain, getExtension, getFilename, getMimetype } from '@/lib/api/upload';
import { bytes } from '@/lib/bytes';
import { compressFile, CompressResult } from '@/lib/compress';
import { config } from '@/lib/config';
import { hashPassword } from '@/lib/crypto';
import { datasource } from '@/lib/datasource';
import { prisma } from '@/lib/db';
import { fileSelect } from '@/lib/db/models/file';
import { sanitizeFilename } from '@/lib/fs';
import { removeGps } from '@/lib/gps';
import { log } from '@/lib/logger';
import { parseHeaders, UploadHeaders } from '@/lib/uploader/parseHeaders';
import { onUpload } from '@/lib/webhooks';
import { Prisma } from '@/prisma/client';
import { userMiddleware } from '@/server/middleware/user';
import typedPlugin from '@/server/typedPlugin';
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
          response: {
            200: z.union([
              z.string(),
              z.object({
                files: z.array(
                  z.object({
                    id: z.string(),
                    name: z.string(),
                    type: z.string(),
                    url: z.string(),
                    pending: z.boolean().optional(),
                    removedGps: z.boolean().optional(),
                    compressed: z.any().optional(),
                  }),
                ),
                deletesAt: z.string().optional(),
                assumedMimetypes: z.array(z.boolean()).optional(),
              }),
            ]),
          },
        },
      },
      async (req, res) => {
        const options = parseHeaders(req.headers, config.files);
        if (options.header) return res.badRequest(`bad options: ${options.message}`);

        if (options.partial) return res.badRequest('bad options, receieved: partial upload');

        let folder = null;
        if (options.folder) {
          folder = await prisma.folder.findFirst({
            where: {
              id: options.folder,
            },
          });
          if (!folder) return res.badRequest('folder not found');
          if (!req.user && !folder.allowUploads) return res.forbidden('folder is not open');
        }

        const files = await req.saveRequestFiles({ tmpdir: config.core.tempDirectory });

        const totalFileSize = files.reduce((acc, x) => acc + x.file.bytesRead, 0);
        const quotaCheck = await checkQuota(req.user, totalFileSize, files.length);
        if (quotaCheck !== true) return res.payloadTooLarge(quotaCheck);

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

        logger.debug('uploading files', { files: files.map((x) => x.filename) });

        for (let i = 0; i !== files.length; ++i) {
          const file = files[i];
          const extension = getExtension(file.filename, options.overrides?.extension);

          if (config.files.disabledExtensions.includes(extension))
            return res.badRequest(`file[${i}]: File extension ${extension} is not allowed`);
          if (file.file.bytesRead > bytes(config.files.maxFileSize))
            return res.payloadTooLarge(
              `file[${i}]: File size is too large. Maximum file size is ${bytes(config.files.maxFileSize)} bytes`,
            );

          // determine filename
          const format = options.format || config.files.defaultFormat;
          const nameResult = await getFilename(format, file.filename, extension, options.overrides?.filename);
          if ('error' in nameResult) return res.badRequest(`file[${i}]: ${nameResult.error}`);

          const { fileName } = nameResult;

          // determine mimetype
          const { mimetype, assumed } = await getMimetype(file.mimetype, extension);
          if (!assumed && config.files.assumeMimetypes) {
            logger.warn(
              `file[${i}]: mimetype ${file.mimetype} was not recognized, to ignore this warning, turn off assume mimetypes.`,
            );

            return res.badRequest(
              `file[${i}]: mimetype ${file.mimetype} was not recognized, supply a valid mimetype`,
            );
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

          if (options.maxViews) data.maxViews = options.maxViews;
          if (options.password) data.password = await hashPassword(options.password);
          if (folder) data.Folder = { connect: { id: folder.id } };
          if (options.addOriginalName) {
            const sanitizedOG = sanitizeFilename(file.filename);
            if (!sanitizedOG) return res.badRequest(`file[${i}]: Invalid characters in original filename`);

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

        return res.send(response);
      },
    );
  },
  { name: PATH },
);
