import { ApiError } from '@/lib/api/errors';
import { checkQuota, getDomain, getExtension, getFilename, resolveUploadMimetype } from '@/lib/api/upload';
import { bytes } from '@/lib/bytes';
import { config } from '@/lib/config';
import { hashPassword } from '@/lib/crypto';
import { db } from '@/lib/db';
import { removeFile, type FileInsert, lockFileOwner, updateFile } from '@/lib/db/models/file';
import { getFolderMetadata } from '@/lib/db/models/folder';
import { createIncompleteFile, completeChunk, updateIncompleteFile } from '@/lib/db/models/incompleteFile';
import { files as fileTable } from '@/lib/db/schema';
import { getUser } from '@/lib/db/models/user';
import { sanitizeFilename } from '@/lib/fs';
import { log } from '@/lib/logger';
import { randomCharacters } from '@/lib/random';
import { UploadHeaders, UploadOptions, parseHeaders } from '@/lib/uploader/parseHeaders';
import { userMiddleware } from '@/server/middleware/user';
import typedPlugin from '@/server/typedPlugin';
import { z } from 'zod';
import { readdir, rename, rm } from 'fs/promises';
import { join } from 'path';
import { createWorker } from '@/lib/worker';
import { ApiUploadResponse } from '.';
import type { DomainDbRequest, DomainDbResponse } from '@/offload/proxiedDb';

const logger = log('api').c('upload').c('partial');

const PARTIAL_TIMEOUT = 30 * 60_000;
const MAX_PARTIALS = 4;

type PartialCache = {
  length: number;
  options: UploadOptions;
  prefix: string;
  actorKey: string;
  quotaUserId: string | null;
  total: number;
  finalized: boolean;
  timeout?: NodeJS.Timeout;
};

const partialsCache = new Map<string, PartialCache>();

function resetPartialTimeout(identifier: string) {
  const cache = partialsCache.get(identifier);
  if (!cache || cache.finalized) return;

  if (cache.timeout) clearTimeout(cache.timeout);
  cache.timeout = setTimeout(() => {
    void deletePartial(identifier).catch((error) => {
      logger.warn('failed to clean up inactive partial upload', { identifier, error });
    });
  }, PARTIAL_TIMEOUT);
  cache.timeout.unref();
}

function createPartial(options: UploadOptions, actorKey: string, quotaUserId: string | null, total: number) {
  const identifier = randomCharacters(8);

  const prefix = `zipline_partial_${identifier}_`;

  partialsCache.set(identifier, {
    length: 0,
    options,
    prefix,
    actorKey,
    quotaUserId,
    total,
    finalized: false,
  });
  resetPartialTimeout(identifier);

  return identifier;
}

function activePartials(actorKey: string) {
  let count = 0;
  for (const partial of partialsCache.values()) {
    if (partial.actorKey === actorKey && ++count >= MAX_PARTIALS) return count;
  }

  return count;
}

function quotaReservations(quotaUserId: string) {
  let size = 0;
  let files = 0;
  for (const partial of partialsCache.values()) {
    if (partial.quotaUserId !== quotaUserId || partial.finalized) continue;

    size += partial.total;
    files++;
  }

  return { size, files };
}

async function deletePartial(identifier: string, deleteFiles = true) {
  const cache = partialsCache.get(identifier);
  if (!cache) return;

  partialsCache.delete(identifier);
  if (cache.timeout) clearTimeout(cache.timeout);

  if (deleteFiles) {
    const tempFiles = await readdir(config.core.tempDirectory);
    await Promise.all(
      tempFiles.filter((f) => f.startsWith(cache.prefix)).map((f) => rm(join(config.core.tempDirectory, f))),
    );
  }
}

async function deleteOrphanedPartialFiles() {
  const tempFiles = await readdir(config.core.tempDirectory);
  const orphaned = tempFiles.filter((file) => {
    if (!file.startsWith('zipline_partial_')) return false;

    for (const partial of partialsCache.values()) {
      if (file.startsWith(partial.prefix)) return false;
    }

    return true;
  });

  await Promise.all(orphaned.map((file) => rm(join(config.core.tempDirectory, file), { force: true })));

  if (orphaned.length) logger.info('cleaned up orphaned partial uploads', { files: orphaned.length });
}

export type ApiUploadPartialResponse = ApiUploadResponse & {
  partialSuccess?: boolean;
  partialIdentifier?: string;
};

export const PATH = '/api/upload/partial';
export default typedPlugin(
  async (server) => {
    await deleteOrphanedPartialFiles().catch((error) => {
      logger.warn('failed to clean up orphaned partial uploads on startup', { error });
    });

    const orphanCleanup = setInterval(() => {
      void deleteOrphanedPartialFiles().catch((error) => {
        logger.warn('failed to clean up orphaned partial uploads', { error });
      });
    }, PARTIAL_TIMEOUT);
    orphanCleanup.unref();
    server.addHook('onClose', async () => clearInterval(orphanCleanup));

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
          tags: ['auth'],
        },
        preHandler: [userMiddleware, rateLimit],
      },
      async (req, res) => {
        const options = parseHeaders(req.headers, config.files);

        if (!options.partial) throw new ApiError(1004);
        if (!options.partial.range || options.partial.range.length !== 3) throw new ApiError(1002);

        const [start, end, total] = options.partial.range;
        if (start < 0 || end < start || total < 0 || end > total) throw new ApiError(1002);
        if (total > bytes(config.files.maxFileSize)) throw new ApiError(5001);

        let folder = null;
        if (options.folder) {
          folder = await getFolderMetadata(options.folder);
          if (!folder) throw new ApiError(4001);

          const ownsFolder = req.user ? folder.userId === req.user.id : false;
          if (!ownsFolder && !folder.allowUploads) throw new ApiError(req.user ? 3011 : 3002);
        }

        // use quota of folder owner for anonymous uploads
        const quotaUser = req.user ? req.user : folder?.userId ? await getUser(folder.userId) : null;

        const actorKey = req.user ? `user:${req.user.id}` : `anonymous:${folder?.id ?? 'unknown'}:${req.ip}`;

        let cache: PartialCache | undefined;
        if (start === 0) {
          if (activePartials(actorKey) >= MAX_PARTIALS)
            throw new ApiError(1003, 'Too many active partial uploads');

          options.partial.identifier = createPartial(options, actorKey, quotaUser?.id ?? null, total);
          cache = partialsCache.get(options.partial.identifier);

          if (quotaUser?.id) {
            const reserved = quotaReservations(quotaUser.id);
            const quotaCheck = await checkQuota(quotaUser, reserved.size, reserved.files);
            if (quotaCheck !== true) {
              await deletePartial(options.partial.identifier);
              throw new ApiError(5002, typeof quotaCheck === 'string' ? quotaCheck : undefined);
            }
          }
        } else {
          if (!options.partial.identifier) throw new ApiError(1003);

          cache = partialsCache.get(options.partial.identifier);
          if (
            !cache ||
            cache.actorKey !== actorKey ||
            cache.options.folder !== options.folder ||
            cache.total !== total ||
            cache.finalized
          )
            throw new ApiError(1003);

          resetPartialTimeout(options.partial.identifier);
        }

        if (!cache) throw new ApiError(1003);

        let files;
        try {
          ({ files } = await req.saveRequestFiles({ tmpdir: config.core.tempDirectory }));
        } catch (error) {
          await deletePartial(options.partial.identifier);
          throw error;
        }

        const response: ApiUploadPartialResponse = {
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

        logger.debug('saving partial files', {
          partial: options.partial,
          files: files.map((x) => x.filename),
        });

        if (files.length !== 1) {
          await deletePartial(options.partial.identifier);
          throw new ApiError(files.length > 1 ? 1005 : 1062);
        }
        const file = files[0];
        const fileSize = file.file.bytesRead;

        if (end - start !== fileSize) {
          await deletePartial(options.partial.identifier);
          throw new ApiError(1002);
        }

        // file is too large so we delete everything
        if (cache.length + fileSize > total) {
          await deletePartial(options.partial.identifier);
          throw new ApiError(5001);
        }

        cache.length += fileSize;

        if (options.partial.lastchunk && cache.length !== total) {
          await deletePartial(options.partial.identifier);
          throw new ApiError(1002);
        }

        // handle partial stuff
        const sanitized = sanitizeFilename(
          `${cache.prefix}${options.partial.range[0]}_${options.partial.range[1]}`,
        );
        if (!sanitized) throw new ApiError(1007);

        const tempFile = join(config.core.tempDirectory, sanitized);
        await rename(file.filepath, tempFile);
        if (req.tmpUploads) req.tmpUploads = req.tmpUploads.filter((path) => path !== file.filepath);

        if (options.partial.lastchunk) {
          const extension = getExtension(options.partial.filename, options.overrides?.extension);
          if (config.files.disabledExtensions.includes(extension)) throw new ApiError(1006);

          // determine filename
          const format = options.format || config.files.defaultFormat;
          let fileName: string;
          try {
            fileName = await getFilename(
              format,
              options.partial.filename,
              extension,
              options.overrides?.filename,
            );
          } catch (error) {
            throw new ApiError(1009, String(error));
          }

          // determine mimetype
          const { assumed, mimetype } = await resolveUploadMimetype(options.partial.contentType, extension);

          if (config.files.assumeMimetypes) response.assumedMimetypes![0] = assumed;

          const data: FileInsert = {
            name: `${fileName}${extension}`,
            size: total,
            type: mimetype,
            userId: req.user ? req.user.id : options.folder ? folder?.userId : undefined,
          };

          if (options.password) data.password = await hashPassword(options.password);
          if (options.maxViews) data.maxViews = options.maxViews;
          if (folder) data.folderId = folder.id;
          if (options.addOriginalName) {
            const sanitizedOG = sanitizeFilename(options.partial.filename);
            if (!sanitizedOG) throw new ApiError(1008);

            data.originalName = sanitizedOG;
          }
          if (!req.user && folder) data.anonymous = true;

          let fileUpload;
          try {
            fileUpload = await db.transaction(async (tx) => {
              if (quotaUser?.quota) {
                await lockFileOwner(quotaUser.id, tx);

                const quotaCheck = await checkQuota(quotaUser, total, 1, tx);
                if (quotaCheck !== true)
                  throw new ApiError(5002, typeof quotaCheck === 'string' ? quotaCheck : undefined);
              }

              const [created] = await tx.insert(fileTable).values(data).returning();
              if (!created) throw new Error('File insert did not return a row');
              return created;
            });
          } catch (error) {
            await deletePartial(options.partial.identifier);
            throw error;
          }

          const urlPath =
            options.extensionless && config.files.extensionlessUrls
              ? fileUpload.name.slice(0, -extension.length)
              : fileUpload.name;

          const responseUrl = `${domain}${
            config.files.route === '/' || config.files.route === '' ? '' : `${config.files.route}`
          }/${urlPath}`;

          const worker = createWorker('offload/partial.js', {
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

          cache.finalized = true;
          if (cache.timeout) clearTimeout(cache.timeout);
          cache.timeout = undefined;

          const partialIdentifier = options.partial.identifier;

          worker.on('message', async (message: DomainDbRequest) => {
            if (message.type !== 'db') return;
            let result: unknown = null;

            switch (message.command) {
              case 'incomplete.create':
                result = await createIncompleteFile(message.payload);
                break;
              case 'incomplete.increment':
                result = await completeChunk(message.payload.id, message.payload.status);
                break;
              case 'incomplete.status':
                result = await updateIncompleteFile(message.payload.id, {
                  status: message.payload.status,
                });
                break;
              case 'file.finalizePartial':
                result = await updateFile(message.payload.id, message.payload.changes);
                await deletePartial(partialIdentifier, false);
                break;
              case 'file.delete': {
                const deleted = await removeFile(message.payload.id);
                result = deleted ? { id: deleted.id } : null;
                break;
              }
              case 'user.uploadContext':
                result = await getUser(message.payload.id);
                break;
              default:
                logger.error('unsupported partial worker database command', {
                  command: message.command,
                });
            }

            worker.postMessage({
              type: 'db-response',
              id: message.id,
              result: JSON.stringify(result),
            } satisfies DomainDbResponse);
          });

          worker.once('exit', () => {
            void deletePartial(partialIdentifier).catch((error) => {
              logger.warn('failed to clean up partial upload after worker exit', {
                identifier: partialIdentifier,
                error,
              });
            });
          });

          response.files.push({
            id: fileUpload.id,
            name: fileUpload.name,
            type: fileUpload.type,
            url: responseUrl,
            pending: true,
          });
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
