import { ApiError } from '@/lib/api/errors';
import {
  claimPartial,
  cleanupClaimedPartial,
  completePartialChunk,
  createPartial,
  deleteOrphanedPartialFiles,
  deletePartial,
  finalizePartial,
  getClaimedPartial,
  PARTIAL_TIMEOUT,
  quotaReservations,
} from '@/lib/api/partial';
import {
  checkQuota,
  getDomain,
  getExtension,
  getFilename,
  isExtensionDisabled,
  resolveUploadMimetype,
} from '@/lib/api/upload';
import { bytes } from '@/lib/bytes';
import { config } from '@/lib/config';
import { hashPassword } from '@/lib/crypto';
import { db } from '@/lib/db';
import { removeFile, type FileInsert } from '@/lib/db/models/file';
import { getFolderMetadata } from '@/lib/db/models/folder';
import { getUser } from '@/lib/db/models/user';
import { files, incompleteFiles, users } from '@/lib/db/schema';
import { sanitizeFilename } from '@/lib/fs';
import { log } from '@/lib/logger';
import { parseHeaders, UploadHeaders } from '@/lib/uploader/parseHeaders';
import { formatRootUrl } from '@/lib/url';
import { createWorker } from '@/lib/worker';
import type { DomainDbRequest, DomainDbResponse } from '@/offload/proxiedDb';
import { userMiddleware } from '@/server/middleware/user';
import typedPlugin from '@/server/typedPlugin';
import { eq, getColumns, sql } from 'drizzle-orm';
import { rename } from 'fs/promises';
import { join } from 'path';
import { z } from 'zod';
import { ApiUploadResponse } from '.';

const logger = log('api').c('upload').c('partial');
const { password: _password, userId: _userId, ...uploadFileColumns } = getColumns(files);

export type ApiUploadPartialResponse = ApiUploadResponse & {
  partialSuccess?: boolean;
  partialToken?: string;
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

    server.addHook('onRequestAbort', cleanupClaimedPartial);

    const rateLimit = server.rateLimit?.();

    server.post<{
      Headers: UploadHeaders;
    }>(
      PATH,
      {
        schema: {
          description:
            'Upload a single file in sequential chunks. The first chunk is rate limited. Each non-final chunk returns a single-use partialToken, valid for 30 minutes, which must be sent as x-zipline-p-token on the next chunk.',
          response: {
            200: z.custom<ApiUploadPartialResponse>(),
          },
          tags: ['auth'],
        },
        preHandler: [
          userMiddleware,
          async (req, res) => {
            if (!claimPartial(req) && rateLimit) await rateLimit.call(server, req, res);
          },
        ],
        onResponse: cleanupClaimedPartial,
      },
      async (req, res) => {
        const options = parseHeaders(req.headers, config.files);

        if (!options.partial) throw new ApiError(1004);
        if (!options.partial.range || options.partial.range.length !== 3) throw new ApiError(1002);

        const [start, end, total] = options.partial.range;
        if (
          ![start, end, total].every(Number.isSafeInteger) ||
          start < 0 ||
          end < start ||
          end >= total ||
          options.partial.contentLength !== total ||
          options.partial.lastchunk !== (end === total - 1)
        )
          throw new ApiError(1002);

        if (total > bytes(config.files.maxFileSize)) throw new ApiError(5001);

        let folder = null;
        if (options.folder) {
          folder = await getFolderMetadata(options.folder);
          if (!folder) throw new ApiError(4001);

          const ownsFolder = req.user ? folder.userId === req.user.id : false;
          if (!ownsFolder && !folder.allowUploads) throw new ApiError(req.user ? 3011 : 3002);
        }

        // use quota of folder owner for anonymous uploads
        let quotaUser = req.user ? req.user : null;
        if (!quotaUser && folder?.userId) quotaUser = await getUser(folder.userId);

        if (start === 0) {
          options.partial.identifier = createPartial(req, options, quotaUser?.id ?? null, total);

          if (quotaUser?.id) {
            const reserved = quotaReservations(quotaUser.id);
            const quotaCheck = await checkQuota(quotaUser, reserved.size, reserved.files);
            if (quotaCheck !== true) {
              await deletePartial(options.partial.identifier);
              throw new ApiError(5002, typeof quotaCheck === 'string' ? quotaCheck : undefined);
            }
          }
        }

        const { identifier, cache } = getClaimedPartial(req);
        options.partial.identifier = identifier;

        let multipartFiles;
        try {
          const requestFiles = await req.saveRequestFiles({ tmpdir: config.core.tempDirectory });
          multipartFiles = requestFiles.files;
        } catch (error) {
          await deletePartial(identifier);
          throw error;
        }

        getClaimedPartial(req);

        const response: ApiUploadPartialResponse = {
          files: [],
          ...(options.deletesAt && {
            deletesAt: options.deletesAt === 'never' ? 'never' : options.deletesAt.toISOString(),
          }),
          ...(config.files.assumeMimetypes && { assumedMimetypes: Array(multipartFiles.length) }),
        };

        const domain = getDomain(
          options.overrides?.returnDomain,
          config.core.defaultDomain,
          req.headers.host,
        );

        logger.debug('saving partial files', {
          partial: options.partial,
          files: multipartFiles.map((x) => x.filename),
        });

        if (multipartFiles.length !== 1) {
          await deletePartial(identifier);
          throw new ApiError(multipartFiles.length > 1 ? 1005 : 1062);
        }
        const file = multipartFiles[0];
        const fileSize = file.file.bytesRead;

        if (end - start + 1 !== fileSize) {
          await deletePartial(identifier);
          throw new ApiError(1002);
        }

        // file is too large so we delete everything
        if (cache.length + fileSize > total) {
          await deletePartial(identifier);
          throw new ApiError(5001);
        }

        cache.length += fileSize;

        if (options.partial.lastchunk && cache.length !== total) {
          await deletePartial(identifier);
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
          if (isExtensionDisabled(extension)) throw new ApiError(1006);

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

          if (options.password) {
            const password = await hashPassword(options.password);
            data.password = password;
          }
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
                await tx.select({ id: users.id }).from(users).where(eq(users.id, quotaUser.id)).for('update');

                const quotaCheck = await checkQuota(quotaUser, total, 1, tx);
                if (quotaCheck !== true)
                  throw new ApiError(5002, typeof quotaCheck === 'string' ? quotaCheck : undefined);
              }

              const [created] = await tx.insert(files).values(data).returning(uploadFileColumns);
              if (!created) throw new ApiError(9005);

              return created;
            });
          } catch (error) {
            await deletePartial(identifier);
            throw error;
          }

          const urlPath =
            options.extensionless && config.files.extensionlessUrls
              ? fileUpload.name.slice(0, -extension.length)
              : fileUpload.name;

          const responseUrl = `${domain}${formatRootUrl(config.files.route, urlPath)}`;

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

          finalizePartial(req);

          worker.on('message', async (message: DomainDbRequest) => {
            if (message.type !== 'db') return;

            try {
              let result: unknown = null;

              switch (message.command) {
                case 'incomplete.create':
                  {
                    const [created] = await db
                      .insert(incompleteFiles)
                      .values(message.payload)
                      .returning({ id: incompleteFiles.id });
                    if (!created) throw new Error('Incomplete file insert did not return a row');
                    result = created;
                  }
                  break;
                case 'incomplete.increment':
                  {
                    const [updated] = await db
                      .update(incompleteFiles)
                      .set({
                        chunksComplete: sql`${incompleteFiles.chunksComplete} + 1`,
                        status: message.payload.status,
                      })
                      .where(eq(incompleteFiles.id, message.payload.id))
                      .returning({ id: incompleteFiles.id });
                    result = updated ?? null;
                  }
                  break;
                case 'incomplete.status':
                  {
                    const [updated] = await db
                      .update(incompleteFiles)
                      .set({ status: message.payload.status })
                      .where(eq(incompleteFiles.id, message.payload.id))
                      .returning({ id: incompleteFiles.id });
                    result = updated ?? null;
                  }
                  break;
                case 'file.finalizePartial': {
                  const [updated] = await db
                    .update(files)
                    .set(message.payload.changes)
                    .where(eq(files.id, message.payload.id))
                    .returning(uploadFileColumns);
                  result = updated ?? null;
                  await deletePartial(identifier, false);
                  break;
                }
                case 'file.delete': {
                  const deleted = await removeFile(message.payload.id);
                  result = deleted ? { id: deleted.id } : null;
                  break;
                }
                case 'user.uploadContext':
                  result = await getUser(message.payload.id);
                  break;
                default:
                  throw new Error(`Unsupported partial worker database command: ${message.command}`);
              }

              worker.postMessage({
                type: 'db-response',
                id: message.id,
                ok: true,
                result,
              } satisfies DomainDbResponse);
            } catch (error) {
              worker.postMessage({
                type: 'db-response',
                id: message.id,
                ok: false,
                error:
                  error instanceof Error
                    ? {
                        name: error.name,
                        message: error.message,
                        ...(error.stack && { stack: error.stack }),
                      }
                    : { name: 'Error', message: String(error) },
              } satisfies DomainDbResponse);
            }
          });

          worker.once('exit', () => {
            void deletePartial(identifier).catch((error) => {
              logger.warn('failed to clean up partial upload after worker exit', {
                identifier,
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

        response.partialToken = completePartialChunk(req);

        return res.send(response);
      },
    );
  },
  { name: PATH },
);
