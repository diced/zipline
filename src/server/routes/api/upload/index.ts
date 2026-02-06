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
import { guess } from '@/lib/mimes';
import { formatFileName } from '@/lib/uploader/formatFileName';
import { parseHeaders, UploadHeaders } from '@/lib/uploader/parseHeaders';
import { onUpload } from '@/lib/webhooks';
import { Prisma } from '@/prisma/client';
import { userMiddleware } from '@/server/middleware/user';
import typedPlugin from '@/server/typedPlugin';
import { stat } from 'fs/promises';
import { extname } from 'path';

const commonDoubleExts = [
  '.tar.gz',
  '.tar.xz',
  '.tar.bz2',
  '.tar.lz',
  '.tar.lzma',
  '.tar.Z',
  '.tar.7z',
  '.zip.gz',
  '.zip.xz',
  '.rar.gz',
  '.log.gz',
  '.csv.gz',
  '.pdf.gz',
  // feel free to PR more
];

export const getExtension = (filename: string, override?: string): string => {
  return override ?? commonDoubleExts.find((ext) => filename.endsWith(ext)) ?? extname(filename);
};

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
    }>(PATH, { preHandler: [userMiddleware, rateLimit] }, async (req, res) => {
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

      if (req.user?.quota) {
        const totalFileSize = files.reduce((acc, x) => acc + x.file.bytesRead, 0);

        const userAggregateStats = await prisma.file.aggregate({
          where: {
            userId: req.user.id,
          },
          _sum: {
            size: true,
          },
          _count: {
            _all: true,
          },
        });
        const aggSize: bigint =
          userAggregateStats!._sum?.size === null
            ? 0n
            : (userAggregateStats!._sum?.size as unknown as bigint);
        if (
          req.user.quota.filesQuota === 'BY_BYTES' &&
          Number(aggSize) + totalFileSize > bytes(req.user.quota.maxBytes!)
        )
          return res.payloadTooLarge(
            `uploading will exceed your storage quota of ${bytes(req.user.quota.maxBytes!)} bytes`,
          );

        if (
          req.user.quota.filesQuota === 'BY_FILES' &&
          userAggregateStats!._count?._all + req.files.length > req.user.quota.maxFiles!
        )
          return res.payloadTooLarge(
            `uploading will exceed your file count quota of ${req.user.quota.maxFiles} files`,
          );
      }

      const response: ApiUploadResponse = {
        files: [],
        ...(options.deletesAt && {
          deletesAt: options.deletesAt === 'never' ? 'never' : options.deletesAt.toISOString(),
        }),
        ...(config.files.assumeMimetypes && { assumedMimetypes: Array(req.files.length) }),
      };

      let domain;
      if (options.overrides?.returnDomain) {
        domain = `${config.core.returnHttpsUrls ? 'https' : 'http'}://${options.overrides.returnDomain}`;
      } else if (config.core.defaultDomain) {
        domain = `${config.core.returnHttpsUrls ? 'https' : 'http'}://${config.core.defaultDomain}`;
      } else {
        domain = `${config.core.returnHttpsUrls ? 'https' : 'http'}://${req.headers.host}`;
      }

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
        let fileName = formatFileName(format, file.filename);
        if (options.overrides?.filename || format === 'name') {
          if (options.overrides?.filename) {
            const sanitized = sanitizeFilename(options.overrides.filename!);
            if (!sanitized) return res.badRequest(`file[${i}]: Invalid characters in filename override`);

            fileName = sanitized;
          }

          const fullFileName = `${fileName}${extension}`;
          const existing = await prisma.file.findFirst({ where: { name: fullFileName } });
          if (existing)
            return res.badRequest(`file[${i}]: A file with the name "${fullFileName}" already exists`);
        } else if (format === 'random') {
          let fullFileName = `${fileName}${extension}`;
          let existing = await prisma.file.findFirst({ where: { name: fullFileName } });
          while (existing) {
            fileName = formatFileName(format, file.filename);
            fullFileName = `${fileName}${extension}`;
            existing = await prisma.file.findFirst({ where: { name: fullFileName } });
          }
        }

        // determine mimetype
        let mimetype = file.mimetype;
        if (mimetype === 'application/octet-stream' && config.files.assumeMimetypes) {
          const mime = await guess(extension.substring(1));

          response.assumedMimetypes![i] = !!mime;
          if (mime) mimetype = mime;
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
        if (options.addOriginalName) data.originalName = file.filename;
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
    });
  },
  { name: PATH },
);
