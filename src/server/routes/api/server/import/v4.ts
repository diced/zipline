import { ApiError } from '@/lib/api/errors';
import { createToken } from '@/lib/crypto';
import { db } from '@/lib/db';
import {
  files,
  filesToTags,
  folders,
  invites,
  metrics,
  oauthProviders,
  tags,
  urls,
  userPasskeys,
  userQuotas,
  users,
} from '@/lib/db/schema';
import { sanitizeFilename } from '@/lib/fs';
import { export4Schema } from '@/lib/import/version4/validateExport';
import { log } from '@/lib/logger';
import { randomCharacters } from '@/lib/random';
import { secondlyRatelimit } from '@/lib/ratelimits';
import { administratorMiddleware } from '@/server/middleware/administrator';
import { userMiddleware } from '@/server/middleware/user';
import typedPlugin from '@/server/typedPlugin';
import { and, eq, isNull, or } from 'drizzle-orm';
import z from 'zod';

export type ApiServerImportV4 = z.infer<typeof serverImportSchema>;

const serverImportSchema = z.object({
  imported: z.object({
    users: z.number(),
    oauthProviders: z.number(),
    quotas: z.number(),
    passkeys: z.number(),
    folders: z.number(),
    files: z.number(),
    tags: z.number(),
    urls: z.number(),
    invites: z.number(),
    metrics: z.number(),
  }),
});

const logger = log('api').c('server').c('import').c('v4');

export const PATH = '/api/server/import/v4';
export default typedPlugin(
  async (server) => {
    server.post(
      PATH,
      {
        schema: {
          description:
            'Import data from a Zipline v4 export file, optionally merging into the current user and returning counts of imported records.',
          body: z.object({
            export4: export4Schema.required(),
            config: z.object({
              settings: z.boolean().optional().default(false),
              mergeCurrentUser: z.string().nullish().default(null),
            }),
          }),
          response: {
            200: serverImportSchema,
          },
          tags: ['auth', 'superadmin'],
        },
        preHandler: [userMiddleware, administratorMiddleware],
        bodyLimit: 24 * 1024 * 1024 * 1024,
        ...secondlyRatelimit(5),
      },
      async (req, res) => {
        if (req.user.role !== 'SUPERADMIN') throw new ApiError(3015);

        const { export4, config: importConfig } = req.body;

        const importedUsers: Record<string, string> = {};

        for (const user of export4.data.users) {
          let mergeCurrent = false;
          if (importConfig.mergeCurrentUser && user.id === importConfig.mergeCurrentUser) {
            logger.info('importing to current user', {
              from: user.id,
              to: req.user.id,
            });

            mergeCurrent = true;
          }

          const [existing] = await db
            .select({ id: users.id })
            .from(users)
            .where(or(eq(users.username, user.username), eq(users.id, user.id)))
            .limit(1);

          if (!mergeCurrent && existing) {
            logger.warn('user already exists with a username or id, skipping importing', {
              id: user.id,
              conflict: existing.id,
            });

            continue;
          }

          if (mergeCurrent) {
            const [updated] = await db
              .update(users)
              .set({
                avatar: user.avatar ?? null,
                totpSecret: user.totpSecret ?? null,
                view: user.view,
              })
              .where(eq(users.id, req.user.id))
              .returning({ id: users.id });
            if (!updated) throw new ApiError(9005);

            importedUsers[user.id] = updated.id;

            continue;
          }

          const [created] = await db
            .insert(users)
            .values({
              username: user.username,
              password: user.password ?? null,
              avatar: user.avatar ?? null,
              role: user.role,
              view: user.view,
              totpSecret: user.totpSecret ?? null,
              token: createToken(),
              createdAt: new Date(user.createdAt),
            })
            .returning({ id: users.id });
          if (!created) throw new ApiError(9005);

          importedUsers[user.id] = created.id;
        }

        logger.debug('imported users', { users: importedUsers });

        const importedOauthProviders: Record<string, string> = {};

        for (const oauthProvider of export4.data.userOauthProviders) {
          const userId = importedUsers[oauthProvider.userId];
          if (!userId) {
            logger.warn('failed to find user for oauth provider, skipping', {
              provider: oauthProvider.id,
              user: oauthProvider.userId,
            });

            continue;
          }

          const [existing] = await db
            .select({ id: oauthProviders.id })
            .from(oauthProviders)
            .where(
              oauthProvider.oauthId === undefined
                ? eq(oauthProviders.provider, oauthProvider.provider)
                : and(
                    eq(oauthProviders.provider, oauthProvider.provider),
                    oauthProvider.oauthId === null
                      ? isNull(oauthProviders.oauthId)
                      : eq(oauthProviders.oauthId, oauthProvider.oauthId),
                  ),
            )
            .limit(1);

          if (existing) {
            logger.warn('oauth provider already exists, skipping importing', {
              id: oauthProvider.id,
              conflict: existing.id,
            });

            continue;
          }

          const [created] = await db
            .insert(oauthProviders)
            .values({
              provider: oauthProvider.provider,
              oauthId: oauthProvider.oauthId,
              username: oauthProvider.username,
              accessToken: oauthProvider.accessToken,
              refreshToken: oauthProvider.refreshToken ?? null,
              userId,
            })
            .returning({ id: oauthProviders.id });
          if (!created) throw new ApiError(9005);

          importedOauthProviders[oauthProvider.id] = created.id;
        }

        logger.debug('imported oauth providers', { oauthProviders: importedOauthProviders });

        const importedQuotas: Record<string, string> = {};

        for (const quota of export4.data.userQuotas) {
          const userId = importedUsers[quota.userId ?? ''];
          if (!userId) {
            logger.warn('failed to find user for quota, skipping', {
              quota: quota.id,
              user: quota.userId,
            });

            continue;
          }

          const [existing] = await db
            .select({ id: userQuotas.id })
            .from(userQuotas)
            .where(eq(userQuotas.userId, userId))
            .limit(1);

          if (existing) {
            logger.warn('quota already exists for user, skipping importing', {
              id: quota.id,
              conflict: existing.id,
            });

            continue;
          }

          const [created] = await db
            .insert(userQuotas)
            .values({
              filesQuota: quota.filesQuota,
              maxBytes: quota.maxBytes ?? null,
              maxFiles: quota.maxFiles ?? null,
              maxUrls: quota.maxUrls ?? null,
              userId,
              createdAt: new Date(quota.createdAt),
            })
            .returning({ id: userQuotas.id });
          if (!created) throw new ApiError(9005);

          importedQuotas[quota.id] = created.id;
        }

        logger.debug('imported quotas', { quotas: importedQuotas });

        const importedPasskeys: Record<string, string> = {};

        for (const passkey of export4.data.userPasskeys) {
          const userId = importedUsers[passkey.userId];
          if (!userId) {
            logger.warn('failed to find user for passkey, skipping', {
              passkey: passkey.id,
              user: passkey.userId,
            });

            continue;
          }

          const [existing] = await db
            .select({ id: userPasskeys.id })
            .from(userPasskeys)
            .where(and(eq(userPasskeys.name, passkey.name), eq(userPasskeys.userId, userId)))
            .limit(1);

          if (existing) {
            logger.warn('passkey already exists for user, skipping importing', {
              id: passkey.id,
              conflict: existing.id,
            });

            continue;
          }

          const [created] = await db
            .insert(userPasskeys)
            .values({ name: passkey.name, reg: passkey.reg, userId })
            .returning({ id: userPasskeys.id });
          if (!created) throw new ApiError(9005);

          importedPasskeys[passkey.id] = created.id;
        }

        logger.debug('imported passkeys', { passkeys: importedPasskeys });

        const importedFolders: Record<string, string> = {};
        const folderParentMap: Record<string, string> = {};

        for (const folder of export4.data.folders) {
          const userId = importedUsers[folder.userId ?? ''];
          if (!userId) {
            logger.warn('failed to find user for folder, skipping', {
              folder: folder.id,
              user: folder.userId,
            });

            continue;
          }

          const [existing] = await db
            .select({ id: folders.id })
            .from(folders)
            .where(and(eq(folders.name, folder.name), eq(folders.userId, userId)))
            .limit(1);

          if (existing) {
            logger.warn('folder already exists, skipping importing', {
              id: folder.id,
              conflict: existing.id,
            });

            continue;
          }

          const [created] = await db
            .insert(folders)
            .values({
              userId,
              name: folder.name,
              allowUploads: folder.allowUploads,
              public: folder.public,
              createdAt: new Date(folder.createdAt),
            })
            .returning({ id: folders.id });
          if (!created) throw new ApiError(9005);

          importedFolders[folder.id] = created.id;

          if (folder.parentId) {
            folderParentMap[folder.id] = folder.parentId;
          }
        }

        for (const [oldFolderId, oldParentId] of Object.entries(folderParentMap)) {
          const newFolderId = importedFolders[oldFolderId];
          const newParentId = importedFolders[oldParentId];

          if (newFolderId && newParentId) {
            const [updated] = await db
              .update(folders)
              .set({ parentId: newParentId })
              .where(eq(folders.id, newFolderId))
              .returning({ id: folders.id });
            if (!updated) throw new ApiError(9005);
          } else {
            logger.warn('failed to set parent for folder', {
              folder: oldFolderId,
              parent: oldParentId,
            });
          }
        }

        logger.debug('imported folders', { folders: importedFolders });

        const importedFiles: Record<string, string> = {};

        for (const file of export4.data.files) {
          const userId = importedUsers[file.userId ?? ''];
          if (!userId) {
            logger.warn('failed to find user for file, skipping', {
              file: file.id,
              user: file.userId,
            });

            continue;
          }

          const [existing] = await db
            .select({ id: files.id })
            .from(files)
            .where(eq(files.name, file.name))
            .limit(1);

          if (existing) {
            logger.warn('file already exists, skipping importing', {
              id: file.id,
              conflict: existing.id,
            });

            continue;
          }

          const folderId = file.folderId ? importedFolders[file.folderId] : null;

          let sanitizedFilename = sanitizeFilename(file.name);
          if (!sanitizedFilename) {
            sanitizedFilename = randomCharacters(12);
            logger.warn('file has invalid name, using random name', {
              file: file.id,
              new: sanitizedFilename,
            });
          }

          const [created] = await db
            .insert(files)
            .values({
              userId,
              name: sanitizedFilename,
              size: file.size,
              type: file.type,
              folderId,
              originalName: file.originalName ?? null,
              maxViews: file.maxViews ?? null,
              views: file.views ?? 0,
              deletesAt: file.deletesAt ? new Date(file.deletesAt) : null,
              createdAt: new Date(file.createdAt),
              favorite: file.favorite ?? false,
              password: file.password ?? null,
            })
            .returning({ id: files.id });
          if (!created) throw new ApiError(9005);

          importedFiles[file.id] = created.id;
        }

        logger.debug('imported files', { files: importedFiles });

        const importedTags: Record<string, string> = {};

        for (const tag of export4.data.userTags) {
          const userId = tag.userId ? importedUsers[tag.userId] : undefined;

          if (!userId) {
            logger.warn('tag has no user, skipping', { id: tag.id });

            continue;
          }

          const [existing] = await db
            .select({ id: tags.id })
            .from(tags)
            .where(
              and(
                eq(tags.name, tag.name),
                eq(tags.userId, userId),
                eq(tags.createdAt, new Date(tag.createdAt)),
              ),
            )
            .limit(1);

          if (existing) {
            logger.warn('tag already exists, skipping importing', {
              id: tag.id,
              conflict: existing.id,
            });

            continue;
          }

          const fileIds = tag.files.flatMap((fileId) => {
            const importedFileId = importedFiles[fileId];
            if (importedFileId) return [importedFileId];

            logger.warn('tag file was not imported, skipping relation', { tag: tag.id, file: fileId });
            return [];
          });

          const created = await db.transaction(async (tx) => {
            const [created] = await tx
              .insert(tags)
              .values({ name: tag.name, color: tag.color ?? '#000000', userId })
              .returning({ id: tags.id });
            if (!created) throw new ApiError(9005);

            if (fileIds.length) {
              await tx.insert(filesToTags).values(fileIds.map((fileId) => ({ fileId, tagId: created.id })));
            }

            return created;
          });

          importedTags[tag.id] = created.id;
        }

        logger.debug('imported tags', { tags: importedTags });

        const importedUrls: Record<string, string> = {};

        for (const url of export4.data.urls) {
          const userId = url.userId ? importedUsers[url.userId] : null;

          if (!userId) {
            logger.warn('failed to find user for url, skipping', {
              url: url.id,
              user: url.userId,
            });

            continue;
          }

          const [existing] = await db
            .select({ id: urls.id })
            .from(urls)
            .where(and(eq(urls.code, url.code), eq(urls.userId, userId)))
            .limit(1);

          if (existing) {
            logger.warn('url already exists, skipping importing', {
              id: url.id,
              conflict: existing.id,
            });

            continue;
          }

          const [created] = await db
            .insert(urls)
            .values({
              userId,
              destination: url.destination,
              vanity: url.vanity ?? null,
              code: url.code,
              maxViews: url.maxViews ?? null,
              views: url.views,
              enabled: url.enabled,
              createdAt: new Date(url.createdAt),
              password: url.password ?? null,
            })
            .returning({ id: urls.id });
          if (!created) throw new ApiError(9005);

          importedUrls[url.id] = created.id;
        }

        logger.debug('imported urls', { urls: importedUrls });

        const importedInvites: Record<string, string> = {};

        for (const invite of export4.data.invites) {
          const inviterId = importedUsers[invite.inviterId];
          if (!inviterId) {
            logger.warn('failed to find inviter for invite, skipping', {
              invite: invite.id,
              inviter: invite.inviterId,
            });

            continue;
          }

          const [existing] = await db
            .select({ id: invites.id })
            .from(invites)
            .where(and(eq(invites.code, invite.code), eq(invites.inviterId, inviterId)))
            .limit(1);

          if (existing) {
            logger.warn('invite already exists, skipping importing', {
              id: invite.id,
              conflict: existing.id,
            });

            continue;
          }

          const [created] = await db
            .insert(invites)
            .values({
              code: invite.code,
              uses: invite.uses,
              maxUses: invite.maxUses ?? null,
              inviterId,
              createdAt: new Date(invite.createdAt),
              expiresAt: invite.expiresAt ? new Date(invite.expiresAt) : null,
            })
            .returning({ id: invites.id });
          if (!created) throw new ApiError(9005);

          importedInvites[invite.id] = created.id;
        }

        logger.debug('imported invites', { invites: importedInvites });

        let metricCount = 0;
        if (export4.data.metrics.length) {
          const importedMetrics = await db
            .insert(metrics)
            .values(
              export4.data.metrics.map((metric) => ({
                createdAt: new Date(metric.createdAt),
                data: metric.data,
              })),
            )
            .returning({ id: metrics.id });
          metricCount = importedMetrics.length;
        }
        logger.debug('imported metrics', { count: metricCount });

        const response = {
          imported: {
            users: Object.keys(importedUsers).length,
            oauthProviders: Object.keys(importedOauthProviders).length,
            quotas: Object.keys(importedQuotas).length,
            passkeys: Object.keys(importedPasskeys).length,
            folders: Object.keys(importedFolders).length,
            files: Object.keys(importedFiles).length,
            tags: Object.keys(importedTags).length,
            urls: Object.keys(importedUrls).length,
            invites: Object.keys(importedInvites).length,
            metrics: metricCount,
          },
        };

        return res.send(response);
      },
    );
  },
  { name: PATH },
);
