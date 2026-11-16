import { ApiError } from '@/lib/api/errors';
import {
  claimPartial,
  cleanupClaimedPartial,
  completePartialChunk,
  createPartial,
  deleteOrphanedPartialFiles,
  getClaimedPartial,
  PARTIAL_TIMEOUT,
  quotaReservations,
  runPartialUpload,
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
import { lockFiles, type FileInsert } from '@/lib/db/models/file';
import { getFolderMetadata } from '@/lib/db/models/folder';
import { getUser } from '@/lib/db/models/user';
import { files, incompleteFiles, users } from '@/lib/db/schema';
import { sanitizeFilename } from '@/lib/fs';
import { log } from '@/lib/logger';
import { parseHeaders, UploadHeaders } from '@/lib/uploader/parseHeaders';
import { formatRootUrl } from '@/lib/url';
import { onUpload } from '@/lib/webhooks';
import { userMiddleware } from '@/server/middleware/user';
import typedPlugin from '@/server/typedPlugin';
import { eq } from 'drizzle-orm';
import { rename } from 'fs/promises';
import { join } from 'path';
import { z } from 'zod';
import { ApiUploadResponse } from '.';

const logger = log('api').c('upload').c('partial');

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
          createPartial(req, options.folder, quotaUser?.id ?? null, total);

          if (quotaUser?.id) {
            const reserved = quotaReservations(quotaUser.id);
            const quotaCheck = await checkQuota(quotaUser, reserved.size, reserved.files);
            if (quotaCheck !== true)
              throw new ApiError(5002, typeof quotaCheck === 'string' ? quotaCheck : undefined);
          }
        }

        const { identifier, cache } = getClaimedPartial(req);
        options.partial.identifier = identifier;

        const { files: multipartFiles } = await req.saveRequestFiles({ tmpdir: cache.directory });

        // Reading the body can outlive the session or be interrupted by an abort.
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

        if (multipartFiles.length !== 1) throw new ApiError(multipartFiles.length > 1 ? 1005 : 1062);
        const file = multipartFiles[0];
        const fileSize = file.file.bytesRead;

        if (end - start + 1 !== fileSize) throw new ApiError(1002);

        cache.length += fileSize;

        const tempFile = join(cache.directory, `${cache.prefix}${start}_${end}`);
        await rename(file.filepath, tempFile);
        if (req.tmpUploads) req.tmpUploads = req.tmpUploads.filter((path) => path !== file.filepath);

        if (options.partial.lastchunk) {
          const extension = getExtension(options.partial.filename, options.overrides?.extension);
          if (isExtensionDisabled(extension)) throw new ApiError(1006);

          const format = options.format || config.files.defaultFormat;

          // determine mimetype
          const { assumed, mimetype } = await resolveUploadMimetype(options.partial.contentType, extension);

          if (config.files.assumeMimetypes) response.assumedMimetypes![0] = assumed;

          const data: Omit<FileInsert, 'name'> = {
            size: total,
            type: mimetype,
            userId: req.user ? req.user.id : options.folder ? folder?.userId : undefined,
          };

          if (options.password) {
            const password = await hashPassword(options.password);
            data.password = password;
          }
          if (options.maxViews) data.maxViews = options.maxViews;
          if (options.discordPreviewMode) data.discordPreviewMode = options.discordPreviewMode;
          if (options.discordComponentEmbed) data.discordComponentEmbed = options.discordComponentEmbed;
          if (folder) data.folderId = folder.id;
          if (options.addOriginalName) {
            const sanitizedOG = sanitizeFilename(options.partial.filename);
            if (!sanitizedOG) throw new ApiError(1008);

            data.originalName = sanitizedOG;
          }
          if (!req.user && folder) data.anonymous = true;

          const { fileUpload, incompleteFile } = await db.transaction(async (tx) => {
            await lockFiles(tx);

            if (quotaUser?.quota) {
              await tx.select({ id: users.id }).from(users).where(eq(users.id, quotaUser.id)).for('update');

              const quotaCheck = await checkQuota(quotaUser, total, 1, tx);
              if (quotaCheck !== true)
                throw new ApiError(5002, typeof quotaCheck === 'string' ? quotaCheck : undefined);
            }

            let fileName: string;
            try {
              fileName = await getFilename(
                format,
                options.partial!.filename,
                extension,
                options.overrides?.filename,
                tx,
              );
            } catch (error) {
              throw new ApiError(1009, String(error));
            }

            const [created] = await tx
              .insert(files)
              .values({ ...data, name: `${fileName}${extension}` })
              .returning({ id: files.id, name: files.name, type: files.type });
            if (!created) throw new ApiError(9005);

            if (!data.userId) throw new ApiError(9005);
            const [incomplete] = await tx
              .insert(incompleteFiles)
              .values({
                userId: data.userId,
                chunksTotal: 0,
                chunksComplete: 0,
                status: 'PENDING',
                metadata: { file: { id: created.id, filename: created.name, type: created.type } },
              })
              .returning({ id: incompleteFiles.id });
            if (!incomplete) throw new ApiError(9005);

            return { fileUpload: created, incompleteFile: incomplete };
          });

          const urlPath =
            options.extensionless && config.files.extensionlessUrls && extension
              ? fileUpload.name.slice(0, -extension.length)
              : fileUpload.name;

          const responseUrl = `${domain}${formatRootUrl(config.files.route, urlPath)}`;

          await runPartialUpload(req, {
            file: fileUpload,
            incompleteFileId: incompleteFile.id,
            deletesAt: options.deletesAt && options.deletesAt !== 'never' ? options.deletesAt : null,
            onComplete(file) {
              if (!quotaUser) return;

              logger.info(`${quotaUser.username} uploaded ${file.name}`, {
                size: bytes(file.size),
                partial: true,
              });
              onUpload(config, {
                user: quotaUser,
                file: { ...file, thumbnail: null, tags: [] },
                link: {
                  raw: `${domain}${formatRootUrl('/raw', file.name)}`,
                  returned: responseUrl,
                },
              });
            },
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
