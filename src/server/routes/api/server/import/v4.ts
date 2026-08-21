import { ApiError } from '@/lib/api/errors';
import { createToken } from '@/lib/crypto';
import { db } from '@/lib/db';
import {
  files as fileRecords,
  filesToTags,
  folders as folderRecords,
  invites as inviteRecords,
  metrics as metricRecords,
  oauthProviders as oauthProviderRecords,
  tags as tagRecords,
  urls as urlRecords,
  userPasskeys as passkeyRecords,
  userQuotas as quotaRecords,
  users as userRecords,
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
            .select({ id: userRecords.id })
            .from(userRecords)
            .where(or(eq(userRecords.username, user.username), eq(userRecords.id, user.id)))
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
              .update(userRecords)
              .set({
                avatar: user.avatar ?? null,
                totpSecret: user.totpSecret ?? null,
                view: user.view,
              })
              .where(eq(userRecords.id, req.user.id))
              .returning({ id: userRecords.id });
            if (!updated) throw new Error(`User ${req.user.id} does not exist`);

            importedUsers[user.id] = updated.id;

            continue;
          }

          const [created] = await db
            .insert(userRecords)
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
            .returning({ id: userRecords.id });
          if (!created) throw new Error('User insert did not return a row');

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
            .select({ id: oauthProviderRecords.id })
            .from(oauthProviderRecords)
            .where(
              oauthProvider.oauthId === undefined
                ? eq(oauthProviderRecords.provider, oauthProvider.provider)
                : and(
                    eq(oauthProviderRecords.provider, oauthProvider.provider),
                    oauthProvider.oauthId === null
                      ? isNull(oauthProviderRecords.oauthId)
                      : eq(oauthProviderRecords.oauthId, oauthProvider.oauthId),
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
            .insert(oauthProviderRecords)
            .values({
              provider: oauthProvider.provider,
              oauthId: oauthProvider.oauthId,
              username: oauthProvider.username,
              accessToken: oauthProvider.accessToken,
              refreshToken: oauthProvider.refreshToken ?? null,
              userId,
            })
            .returning({ id: oauthProviderRecords.id });
          if (!created) throw new Error('OAuth provider insert did not return a row');

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
            .select({ id: quotaRecords.id })
            .from(quotaRecords)
            .where(eq(quotaRecords.userId, userId))
            .limit(1);

          if (existing) {
            logger.warn('quota already exists for user, skipping importing', {
              id: quota.id,
              conflict: existing.id,
            });

            continue;
          }

          const [created] = await db
            .insert(quotaRecords)
            .values({
              filesQuota: quota.filesQuota,
              maxBytes: quota.maxBytes ?? null,
              maxFiles: quota.maxFiles ?? null,
              maxUrls: quota.maxUrls ?? null,
              userId,
              createdAt: new Date(quota.createdAt),
            })
            .returning({ id: quotaRecords.id });
          if (!created) throw new Error('Quota insert did not return a row');

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
            .select({ id: passkeyRecords.id })
            .from(passkeyRecords)
            .where(and(eq(passkeyRecords.name, passkey.name), eq(passkeyRecords.userId, userId)))
            .limit(1);

          if (existing) {
            logger.warn('passkey already exists for user, skipping importing', {
              id: passkey.id,
              conflict: existing.id,
            });

            continue;
          }

          const [created] = await db
            .insert(passkeyRecords)
            .values({ name: passkey.name, reg: passkey.reg, userId })
            .returning({ id: passkeyRecords.id });
          if (!created) throw new Error('Passkey insert did not return a row');

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
            .select({ id: folderRecords.id })
            .from(folderRecords)
            .where(and(eq(folderRecords.name, folder.name), eq(folderRecords.userId, userId)))
            .limit(1);

          if (existing) {
            logger.warn('folder already exists, skipping importing', {
              id: folder.id,
              conflict: existing.id,
            });

            continue;
          }

          const [created] = await db
            .insert(folderRecords)
            .values({
              userId,
              name: folder.name,
              allowUploads: folder.allowUploads,
              public: folder.public,
              createdAt: new Date(folder.createdAt),
            })
            .returning({ id: folderRecords.id });
          if (!created) throw new Error('Folder insert did not return a row');

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
              .update(folderRecords)
              .set({ parentId: newParentId })
              .where(eq(folderRecords.id, newFolderId))
              .returning({ id: folderRecords.id });
            if (!updated) throw new Error(`Folder ${newFolderId} does not exist`);
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
            .select({ id: fileRecords.id })
            .from(fileRecords)
            .where(eq(fileRecords.name, file.name))
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
            .insert(fileRecords)
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
            .returning({ id: fileRecords.id });
          if (!created) throw new Error('File insert did not return a row');

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
            .select({ id: tagRecords.id })
            .from(tagRecords)
            .where(
              and(
                eq(tagRecords.name, tag.name),
                eq(tagRecords.userId, userId),
                eq(tagRecords.createdAt, new Date(tag.createdAt)),
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
              .insert(tagRecords)
              .values({ name: tag.name, color: tag.color ?? '#000000', userId })
              .returning({ id: tagRecords.id });
            if (!created) throw new Error('Tag insert did not return a row');

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
            .select({ id: urlRecords.id })
            .from(urlRecords)
            .where(and(eq(urlRecords.code, url.code), eq(urlRecords.userId, userId)))
            .limit(1);

          if (existing) {
            logger.warn('url already exists, skipping importing', {
              id: url.id,
              conflict: existing.id,
            });

            continue;
          }

          const [created] = await db
            .insert(urlRecords)
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
            .returning({ id: urlRecords.id });
          if (!created) throw new Error('URL insert did not return a row');

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
            .select({ id: inviteRecords.id })
            .from(inviteRecords)
            .where(and(eq(inviteRecords.code, invite.code), eq(inviteRecords.inviterId, inviterId)))
            .limit(1);

          if (existing) {
            logger.warn('invite already exists, skipping importing', {
              id: invite.id,
              conflict: existing.id,
            });

            continue;
          }

          const [created] = await db
            .insert(inviteRecords)
            .values({
              code: invite.code,
              uses: invite.uses,
              maxUses: invite.maxUses ?? null,
              inviterId,
              createdAt: new Date(invite.createdAt),
              expiresAt: invite.expiresAt ? new Date(invite.expiresAt) : null,
            })
            .returning({ id: inviteRecords.id });
          if (!created) throw new Error('Invite insert did not return a row');

          importedInvites[invite.id] = created.id;
        }

        logger.debug('imported invites', { invites: importedInvites });

        const importedMetrics = export4.data.metrics.length
          ? await db
              .insert(metricRecords)
              .values(
                export4.data.metrics.map((metric) => ({
                  createdAt: new Date(metric.createdAt),
                  data: metric.data,
                })),
              )
              .returning({ id: metricRecords.id })
          : [];
        const metricCount = importedMetrics.length;
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
