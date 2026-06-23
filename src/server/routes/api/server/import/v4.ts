import { ApiError } from '@/lib/api/errors';
import { createToken } from '@/lib/crypto';
import { prisma } from '@/lib/db';
import { sanitizeFilename } from '@/lib/fs';
import { export4Schema } from '@/lib/import/version4/validateExport';
import { log } from '@/lib/logger';
import { randomCharacters } from '@/lib/random';
import { secondlyRatelimit } from '@/lib/ratelimits';
import { administratorMiddleware } from '@/server/middleware/administrator';
import { userMiddleware } from '@/server/middleware/user';
import typedPlugin from '@/server/typedPlugin';
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
        // 24gb, just in case
        bodyLimit: 24 * 1024 * 1024 * 1024,
        ...secondlyRatelimit(5),
      },
      async (req, res) => {
        if (req.user.role !== 'SUPERADMIN') throw new ApiError(3015);

        const { export4, config: importConfig } = req.body;

        // users
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

          const existing = await prisma.user.findFirst({
            where: {
              OR: [{ username: user.username }, { id: user.id }],
            },
          });

          if (!mergeCurrent && existing) {
            logger.warn('user already exists with a username or id, skipping importing', {
              id: user.id,
              conflict: existing.id,
            });

            continue;
          }

          if (mergeCurrent) {
            const updated = await prisma.user.update({
              where: {
                id: req.user.id,
              },
              data: {
                avatar: user.avatar ?? null,
                totpSecret: user.totpSecret ?? null,
                view: user.view as any,
              },
            });

            importedUsers[user.id] = updated.id;

            continue;
          }

          const created = await prisma.user.create({
            data: {
              username: user.username,
              password: user.password ?? null,
              avatar: user.avatar ?? null,
              role: user.role,
              view: user.view as any,
              totpSecret: user.totpSecret ?? null,
              token: createToken(),
              createdAt: new Date(user.createdAt),
            },
          });

          importedUsers[user.id] = created.id;
        }

        logger.debug('imported users', { users: importedUsers });

        // oauth providers from users
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

          const existing = await prisma.oAuthProvider.findFirst({
            where: {
              provider: oauthProvider.provider,
              oauthId: oauthProvider.oauthId,
            },
          });

          if (existing) {
            logger.warn('oauth provider already exists, skipping importing', {
              id: oauthProvider.id,
              conflict: existing.id,
            });

            continue;
          }

          const created = await prisma.oAuthProvider.create({
            data: {
              provider: oauthProvider.provider,
              oauthId: oauthProvider.oauthId,
              username: oauthProvider.username,
              accessToken: oauthProvider.accessToken,
              refreshToken: oauthProvider.refreshToken ?? null,
              userId,
            },
          });

          importedOauthProviders[oauthProvider.id] = created.id;
        }

        logger.debug('imported oauth providers', { oauthProviders: importedOauthProviders });

        // quotas from users
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

          const existing = await prisma.userQuota.findFirst({
            where: {
              userId,
            },
          });

          if (existing) {
            logger.warn('quota already exists for user, skipping importing', {
              id: quota.id,
              conflict: existing.id,
            });

            continue;
          }

          const created = await prisma.userQuota.create({
            data: {
              filesQuota: quota.filesQuota,
              maxBytes: quota.maxBytes ?? null,
              maxFiles: quota.maxFiles ?? null,
              maxUrls: quota.maxUrls ?? null,
              userId,
              createdAt: new Date(quota.createdAt),
            },
          });

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

          const existing = await prisma.userPasskey.findFirst({
            where: {
              name: passkey.name,
              userId,
            },
          });

          if (existing) {
            logger.warn('passkey already exists for user, skipping importing', {
              id: passkey.id,
              conflict: existing.id,
            });

            continue;
          }

          const created = await prisma.userPasskey.create({
            data: {
              name: passkey.name,
              reg: passkey.reg as any,
              userId,
            },
          });

          importedPasskeys[passkey.id] = created.id;
        }

        logger.debug('imported passkeys', { passkeys: importedPasskeys });

        // folders - first pass: create all folders without parent relationships
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

          const existing = await prisma.folder.findFirst({
            where: {
              name: folder.name,
              userId,
            },
          });

          if (existing) {
            logger.warn('folder already exists, skipping importing', {
              id: folder.id,
              conflict: existing.id,
            });

            continue;
          }

          const created = await prisma.folder.create({
            data: {
              userId,
              name: folder.name,
              allowUploads: folder.allowUploads,
              public: folder.public,
              createdAt: new Date(folder.createdAt),
            },
          });

          importedFolders[folder.id] = created.id;

          if (folder.parentId) {
            folderParentMap[folder.id] = folder.parentId;
          }
        }

        // folders - second pass: set parent relationships
        for (const [oldFolderId, oldParentId] of Object.entries(folderParentMap)) {
          const newFolderId = importedFolders[oldFolderId];
          const newParentId = importedFolders[oldParentId];

          if (newFolderId && newParentId) {
            await prisma.folder.update({
              where: { id: newFolderId },
              data: { parentId: newParentId },
            });
          } else {
            logger.warn('failed to set parent for folder', {
              folder: oldFolderId,
              parent: oldParentId,
            });
          }
        }

        logger.debug('imported folders', { folders: importedFolders });

        // files
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

          const existing = await prisma.file.findFirst({
            where: {
              name: file.name,
            },
          });

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

          const created = await prisma.file.create({
            data: {
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
            },
          });

          importedFiles[file.id] = created.id;
        }

        logger.debug('imported files', { files: importedFiles });

        // tags, mapped to files and users
        const importedTags: Record<string, string> = {};

        for (const tag of export4.data.userTags) {
          const userId = tag.userId ? importedUsers[tag.userId] : null;

          const existing = await prisma.tag.findFirst({
            where: {
              name: tag.name,
              userId: userId ?? null,
              createdAt: new Date(tag.createdAt),
            },
          });

          if (existing) {
            logger.warn('tag already exists, skipping importing', {
              id: tag.id,
              conflict: existing.id,
            });

            continue;
          }

          if (!userId) {
            logger.warn('tag has no user, skipping', { id: tag.id });

            continue;
          }

          const created = await prisma.tag.create({
            data: {
              name: tag.name,
              color: tag.color ?? '#000000',
              files: {
                connect: tag.files.map((fileId) => ({ id: importedFiles[fileId] })),
              },
              userId,
            },
          });

          importedTags[tag.id] = created.id;
        }

        logger.debug('imported tags', { tags: importedTags });

        // urls
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

          const existing = await prisma.url.findFirst({
            where: {
              code: url.code,
              userId,
            },
          });

          if (existing) {
            logger.warn('url already exists, skipping importing', {
              id: url.id,
              conflict: existing.id,
            });

            continue;
          }

          const created = await prisma.url.create({
            data: {
              userId,
              destination: url.destination,
              vanity: url.vanity ?? null,
              code: url.code,
              maxViews: url.maxViews ?? null,
              views: url.views,
              enabled: url.enabled,
              createdAt: new Date(url.createdAt),
              password: url.password ?? null,
            },
          });

          importedUrls[url.id] = created.id;
        }

        logger.debug('imported urls', { urls: importedUrls });

        // invites
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

          const existing = await prisma.invite.findFirst({
            where: {
              code: invite.code,
              inviterId,
            },
          });

          if (existing) {
            logger.warn('invite already exists, skipping importing', {
              id: invite.id,
              conflict: existing.id,
            });

            continue;
          }

          const created = await prisma.invite.create({
            data: {
              code: invite.code,
              uses: invite.uses,
              maxUses: invite.maxUses ?? null,
              inviterId,
              createdAt: new Date(invite.createdAt),
              expiresAt: invite.expiresAt ? new Date(invite.expiresAt) : null,
            },
          });

          importedInvites[invite.id] = created.id;
        }

        logger.debug('imported invites', { invites: importedInvites });

        const metricRes = await prisma.metric.createMany({
          data: export4.data.metrics.map((metric) => ({
            createdAt: new Date(metric.createdAt),
            data: metric.data as any,
          })),
        });

        // metrics, through batch
        logger.debug('imported metrics', { count: metricRes.count });

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
            metrics: metricRes.count,
          },
        };

        return res.send(response);
      },
    );
  },
  { name: PATH },
);
