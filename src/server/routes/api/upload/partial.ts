import { bytes } from '@/lib/bytes';
import { config } from '@/lib/config';
import { hashPassword } from '@/lib/crypto';
import { prisma } from '@/lib/db';
import { sanitizeFilename } from '@/lib/fs';
import { log } from '@/lib/logger';
import { guess } from '@/lib/mimes';
import { randomCharacters } from '@/lib/random';
import { formatFileName } from '@/lib/uploader/formatFileName';
import { UploadHeaders, UploadOptions, parseHeaders } from '@/lib/uploader/parseHeaders';
import { Prisma } from '@/prisma/client';
import { userMiddleware } from '@/server/middleware/user';
import typedPlugin from '@/server/typedPlugin';
import { readdir, rename, rm } from 'fs/promises';
import { join } from 'path';
import { Worker } from 'worker_threads';
import { ApiUploadResponse, getExtension } from '.';

const logger = log('api').c('upload').c('partial');

const partialsCache = new Map<string, { length: number; options: UploadOptions }>();

export type ApiUploadPartialResponse = ApiUploadResponse & {
  partialSuccess?: boolean;
  partialIdentifier?: string;
};

export const PATH = '/api/upload/partial';
export default typedPlugin(
  async (server) => {
    const rateLimit = server.rateLimit
      ? server.rateLimit()
      : (_req: any, _res: any, next: () => any) => next();

    server.post<{
      Headers: UploadHeaders;
    }>(PATH, { preHandler: [userMiddleware, rateLimit] }, async (req, res) => {
      const options = parseHeaders(req.headers, config.files);
      if (options.header) return res.badRequest('bad options, receieved: ' + JSON.stringify(options));
      if (!options.partial) return res.badRequest('partial upload was not detected');
      if (!options.partial.range || options.partial.range.length !== 3)
        return res.badRequest('Invalid partial upload');

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

      const response: ApiUploadPartialResponse = {
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

      logger.debug('saving partial files', { partial: options.partial, files: files.map((x) => x.filename) });

      if (files.length > 1) return res.badRequest('partial uploads only support one file field');
      const file = files[0];
      const fileSize = file.file.bytesRead;

      // caching for partial uploads server side checks and performance
      if (options.partial.range[0] === 0) {
        const identifier = randomCharacters(8);
        partialsCache.set(identifier, { length: fileSize, options });
        options.partial.identifier = identifier;
      } else {
        if (!options.partial.identifier || !partialsCache.has(options.partial.identifier))
          return res.badRequest('No partial upload identifier provided');
      }

      const cache = partialsCache.get(options.partial.identifier);
      if (!cache) throw 'No partial upload cache found';

      const prefix = `zipline_partial_${options.partial.identifier}_`;

      // file is too large so we delete everything
      if (cache.length + fileSize > bytes(config.files.maxFileSize)) {
        partialsCache.delete(options.partial.identifier);

        const tempFiles = await readdir(config.core.tempDirectory);
        await Promise.all(
          tempFiles.filter((f) => f.startsWith(prefix)).map((f) => rm(join(config.core.tempDirectory, f))),
        );

        return res.payloadTooLarge('File is too large');
      }

      cache.length += fileSize;

      // handle partial stuff
      const tempFile = join(
        config.core.tempDirectory,
        `${prefix}${options.partial.range[0]}_${options.partial.range[1]}`,
      );
      await rename(file.filepath, tempFile);

      if (options.partial.lastchunk) {
        const extension = getExtension(options.partial.filename, options.overrides?.extension);
        if (config.files.disabledExtensions.includes(extension))
          return res.badRequest(`File extension ${extension} is not allowed`);

        // determine filename
        const format = options.format || config.files.defaultFormat;
        let fileName = formatFileName(format, decodeURIComponent(options.partial.filename));

        if (options.overrides?.filename || format === 'name') {
          if (options.overrides?.filename) {
            const sanitized = sanitizeFilename(options.overrides!.filename!);
            if (!sanitized) return res.badRequest('Invalid characters in filename override');

            fileName = sanitized;
          }
          const fullFileName = `${fileName}${extension}`;

          const existing = await prisma.file.findFirst({
            where: {
              name: fullFileName,
            },
          });
          if (existing) return res.badRequest(`A file with the name "${fullFileName}" already exists`);
        } else if (format === 'random') {
          let fullFileName = `${fileName}${extension}`;
          let existing = await prisma.file.findFirst({ where: { name: fullFileName } });
          while (existing) {
            fileName = formatFileName(format, decodeURIComponent(options.partial.filename));
            fullFileName = `${fileName}${extension}`;
            existing = await prisma.file.findFirst({ where: { name: fullFileName } });
          }
        }

        // determine mimetype
        let mimetype = options.partial.contentType;
        if (mimetype === 'application/octet-stream' && config.files.assumeMimetypes) {
          const mime = await guess(extension.substring(1));

          if (!mime) response.assumedMimetypes![0] = false;
          else {
            response.assumedMimetypes![0] = true;
            mimetype = mime;
          }
        }

        const data: Prisma.FileCreateInput = {
          name: `${fileName}${extension}`,
          size: 0,
          type: mimetype,
          User: {
            connect: {
              id: req.user ? req.user.id : options.folder ? folder?.userId : undefined,
            },
          },
        };

        if (options.password) data.password = await hashPassword(options.password);
        if (options.maxViews) data.maxViews = options.maxViews;
        if (folder) data.Folder = { connect: { id: folder.id } };
        if (options.addOriginalName)
          data.originalName = options.partial.filename
            ? decodeURIComponent(options.partial.filename)
            : file.filename; // this will prolly be "blob" but should hopefully never happen

        const fileUpload = await prisma.file.create({
          data,
        });

        const responseUrl = `${domain}${
          config.files.route === '/' || config.files.route === '' ? '' : `${config.files.route}`
        }/${fileUpload.name}`;

        const worker = new Worker('./build/offload/partial.js', {
          workerData: {
            user: {
              id: req.user ? req.user.id : options.folder ? folder?.userId : undefined,
            },
            file: {
              id: fileUpload.id,
              filename: fileUpload.name,
              type: fileUpload.type,
            },
            options,
            domain,
            responseUrl,
            config,
          },
        });

        worker.on('message', async (msg) => {
          if (msg.type === 'query') {
            let result;

            switch (msg.query) {
              case 'incompleteFile.create':
                result = await prisma.incompleteFile.create(msg.data);
                break;
              case 'incompleteFile.update':
                result = await prisma.incompleteFile.update(msg.data);
                break;
              case 'file.update':
                result = await prisma.file.update(msg.data);
                break;
              case 'user.findUnique':
                result = await prisma.user.findUnique(msg.data);
                break;
              default:
                console.error(`Unknown query type: ${msg.query}`);
                result = null;
            }

            worker.postMessage({
              type: 'response',
              id: msg.id,
              result: JSON.stringify(result),
            });
          }
        });

        response.files.push({
          id: fileUpload.id,
          name: fileUpload.name,
          type: fileUpload.type,
          url: responseUrl,
          pending: true,
        });

        partialsCache.delete(options.partial.identifier);
      }

      response.partialSuccess = true;

      // send an identifier if this is the first chunk for server-side checks
      if (options.partial.range[0] === 0) {
        response.partialIdentifier = options.partial.identifier;
      }

      return res.send(response);
    });
  },
  { name: PATH },
);
