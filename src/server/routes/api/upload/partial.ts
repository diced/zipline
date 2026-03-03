import { ApiError } from '@/lib/api/errors';
import { checkQuota, getDomain, getExtension, getFilename } from '@/lib/api/upload';
import { bytes } from '@/lib/bytes';
import { config } from '@/lib/config';
import { hashPassword } from '@/lib/crypto';
import { prisma } from '@/lib/db';
import { sanitizeFilename } from '@/lib/fs';
import { log } from '@/lib/logger';
import { guess } from '@/lib/mimes';
import { randomCharacters } from '@/lib/random';
import { UploadHeaders, UploadOptions, parseHeaders } from '@/lib/uploader/parseHeaders';
import { Prisma } from '@/prisma/client';
import { userMiddleware } from '@/server/middleware/user';
import typedPlugin from '@/server/typedPlugin';
import { z } from 'zod';
import { readdir, rename, rm } from 'fs/promises';
import { join } from 'path';
import { Worker } from 'worker_threads';
import { ApiUploadResponse } from '.';

const logger = log('api').c('upload').c('partial');

const partialsCache = new Map<string, { length: number; options: UploadOptions; prefix: string }>();

function createPartial(length: number, options: UploadOptions) {
  const identifier = randomCharacters(8);

  const prefix = `zipline_partial_${identifier}_`;

  partialsCache.set(identifier, { length, options, prefix });
  return identifier;
}

async function deletePartial(identifier: string, deleteFiles = true) {
  const cache = partialsCache.get(identifier);
  if (!cache) return;

  partialsCache.delete(identifier);

  if (deleteFiles) {
    const tempFiles = await readdir(config.core.tempDirectory);
    await Promise.all(
      tempFiles.filter((f) => f.startsWith(cache.prefix)).map((f) => rm(join(config.core.tempDirectory, f))),
    );
  }
}

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
    }>(
      PATH,
      {
        schema: {
          description:
            'Upload a single file in chunks as a partial upload session, using headers to control chunking and resumption.',
          response: {
            200: z.custom<ApiUploadPartialResponse>(),
          },
        },
        preHandler: [userMiddleware, rateLimit],
      },
      async (req, res) => {
        const options = parseHeaders(req.headers, config.files);
        if (options.header) throw new ApiError(1001, 'bad options, receieved: ' + JSON.stringify(options));
        if (!options.partial) throw new ApiError(1004);
        if (!options.partial.range || options.partial.range.length !== 3) throw new ApiError(1002);

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

        const files = await req.saveRequestFiles({ tmpdir: config.core.tempDirectory });

        const response: ApiUploadPartialResponse = {
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

        logger.debug('saving partial files', {
          partial: options.partial,
          files: files.map((x) => x.filename),
        });

        if (files.length > 1) throw new ApiError(1005);
        const file = files[0];
        const fileSize = file.file.bytesRead;

        // caching for partial uploads server side checks and performance
        if (options.partial.range[0] === 0) {
          options.partial.identifier = createPartial(fileSize, options);
        } else {
          if (!options.partial.identifier || !partialsCache.has(options.partial.identifier))
            throw new ApiError(1003);
        }

        const cache = partialsCache.get(options.partial.identifier);
        if (!cache) throw new ApiError(1003);

        // check quota, using the current added length, and only just adding one file
        const quotaCheck = await checkQuota(req.user, cache.length + fileSize, 1);
        if (quotaCheck !== true) {
          await deletePartial(options.partial.identifier);
          throw new ApiError(5002, typeof quotaCheck === 'string' ? quotaCheck : undefined);
        }

        // file is too large so we delete everything
        if (cache.length + fileSize > bytes(config.files.maxFileSize)) {
          await deletePartial(options.partial.identifier!);
          throw new ApiError(5001);
        }

        cache.length += fileSize;

        // handle partial stuff
        const sanitized = sanitizeFilename(
          `${cache.prefix}${options.partial.range[0]}_${options.partial.range[1]}`,
        );
        if (!sanitized) throw new ApiError(1007);

        const tempFile = join(config.core.tempDirectory, sanitized);
        await rename(file.filepath, tempFile);

        if (options.partial.lastchunk) {
          const extension = getExtension(options.partial.filename, options.overrides?.extension);
          if (config.files.disabledExtensions.includes(extension)) throw new ApiError(1006);

          // determine filename
          const format = options.format || config.files.defaultFormat;
          const nameResult = await getFilename(
            format,
            options.partial.filename,
            extension,
            options.overrides?.filename,
          );
          if ('error' in nameResult) throw new ApiError(1009, nameResult.error);

          const { fileName } = nameResult;

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
          if (options.addOriginalName) {
            const sanitizedOG = sanitizeFilename(options.partial.filename);
            if (!sanitizedOG) throw new ApiError(1008);

            data.originalName = sanitizedOG || file.filename; // this will prolly be "blob" but should hopefully never happen
          }

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

          await deletePartial(options.partial.identifier, false);
        }

        response.partialSuccess = true;

        // send an identifier if this is the first chunk for server-side checks
        if (options.partial.range[0] === 0) {
          response.partialIdentifier = options.partial.identifier;
        }

        return res.send(response);
      },
    );
  },
  { name: PATH },
);
