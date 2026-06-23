import { ApiError } from '@/lib/api/errors';
import { Export4, export4Schema } from '@/lib/import/version4/validateExport';
import { log } from '@/lib/logger';
import { administratorMiddleware } from '@/server/middleware/administrator';
import { userMiddleware } from '@/server/middleware/user';

import { prisma } from '@/lib/db';
import { zQsBoolean } from '@/lib/validation';
import typedPlugin from '@/server/typedPlugin';
import { cpus, hostname, platform, release } from 'os';
import z from 'zod';
import { version } from '../../../../../package.json';

const exportCountsSchema = z.object({
  users: z.number(),
  files: z.number(),
  urls: z.number(),
  folders: z.number(),
  invites: z.number(),
  thumbnails: z.number(),
  metrics: z.number(),
});

type ExportCounts = z.infer<typeof exportCountsSchema>;

async function getCounts(): Promise<ExportCounts> {
  const users = await prisma.user.count();
  const files = await prisma.file.count();
  const urls = await prisma.url.count();
  const folders = await prisma.folder.count();
  const invites = await prisma.invite.count();
  const thumbnails = await prisma.thumbnail.count();
  const metrics = await prisma.metric.count();

  return {
    users,
    files,
    urls,
    folders,
    invites,
    thumbnails,
    metrics,
  };
}

export type ApiServerExport = Export4;

const logger = log('api').c('server').c('export');

export const PATH = '/api/server/export';
export default typedPlugin(
  async (server) => {
    server.get(
      PATH,
      {
        schema: {
          description:
            'Export Zipline server data as a version 4 export bundle or return aggregate counts of core resources.',
          querystring: z.object({
            nometrics: zQsBoolean.optional(),
            counts: zQsBoolean.optional(),
          }),
          response: {
            200: z.union([
              exportCountsSchema.describe('if ?counts=true'),
              export4Schema.describe('if ?counts is not true or not there'),
            ]),
          },
        },
        preHandler: [userMiddleware, administratorMiddleware],
      },
      async (req, res) => {
        if (req.user.role !== 'SUPERADMIN') throw new ApiError(3015);

        if (req.query.counts) {
          const counts = await getCounts();

          return res.send(counts);
        }

        logger.debug('exporting server data', { format: '4', requester: req.user.username });

        const settingsTable = await prisma.zipline.findFirst();
        if (!settingsTable) throw new ApiError(1023);

        const env = Object.fromEntries(
          Object.entries(process.env).filter(
            (entry): entry is [string, string] => typeof entry[1] === 'string',
          ),
        );

        const export4: Export4 = {
          versions: {
            export: '4',
            node: process.version,
            zipline: version,
          },
          request: {
            date: new Date().toISOString(),
            env,
            user: `${req.user.id}:${req.user.username}`,
            os: {
              arch: process.arch,
              cpus: cpus().length,
              hostname: hostname(),
              platform: platform() as Export4['request']['os']['platform'],
              release: release(),
            },
          },
          data: {
            settings: settingsTable,

            users: [],
            userPasskeys: [],
            userQuotas: [],
            userOauthProviders: [],
            userTags: [],

            invites: [],
            folders: [],
            urls: [],
            files: [],
            thumbnails: [],
            metrics: [],
          },
        };

        const users = await prisma.user.findMany({
          include: {
            passkeys: true,
            quota: true,
            oauthProviders: true,
            invites: true,
            urls: true,
            tags: {
              include: {
                files: {
                  select: {
                    id: true,
                  },
                },
              },
            },
            folders: {
              include: {
                files: {
                  select: {
                    id: true,
                  },
                },
              },
            },
          },
        });

        for (const user of users) {
          export4.data.users.push({
            createdAt: user.createdAt.toISOString(),
            id: user.id,
            username: user.username,
            password: user.password,
            avatar: user.avatar,
            role: user.role,
            view: user.view,
            totpSecret: user.totpSecret,
          });

          for (const passkey of user.passkeys) {
            export4.data.userPasskeys.push({
              createdAt: passkey.createdAt.toISOString(),
              id: passkey.id,
              lastUsed: passkey.lastUsed ? passkey.lastUsed.toISOString() : null,
              name: passkey.name,
              reg: passkey.reg as Record<string, any>,
              userId: passkey.userId,
            });
          }

          for (const oauthProvider of user.oauthProviders) {
            export4.data.userOauthProviders.push({
              createdAt: oauthProvider.createdAt.toISOString(),
              id: oauthProvider.id,
              provider: oauthProvider.provider,
              username: oauthProvider.username,
              accessToken: oauthProvider.accessToken,
              refreshToken: oauthProvider.refreshToken,
              oauthId: oauthProvider.oauthId,
              userId: oauthProvider.userId,
            });
          }

          for (const tag of user.tags) {
            export4.data.userTags.push({
              createdAt: tag.createdAt.toISOString(),
              id: tag.id,
              name: tag.name,
              color: tag.color,
              files: tag.files.map((file) => file.id),
              userId: user.id,
            });
          }

          for (const invite of user.invites) {
            export4.data.invites.push({
              createdAt: invite.createdAt.toISOString(),
              id: invite.id,
              code: invite.code,
              uses: invite.uses,
              maxUses: invite.maxUses,
              expiresAt: invite.expiresAt ? invite.expiresAt.toISOString() : null,
              inviterId: invite.inviterId,
            });
          }

          for (const folder of user.folders) {
            export4.data.folders.push({
              createdAt: folder.createdAt.toISOString(),
              id: folder.id,
              name: folder.name,
              public: folder.public,
              allowUploads: folder.allowUploads,
              userId: folder.userId,
              files: folder.files.map((file) => file.id),
              parentId: folder.parentId,
            });
          }

          for (const url of user.urls) {
            export4.data.urls.push({
              createdAt: url.createdAt.toISOString(),
              id: url.id,
              code: url.code,
              vanity: url.vanity,
              destination: url.destination,
              views: url.views,
              maxViews: url.maxViews,
              password: url.password,
              enabled: url.enabled,
              userId: url.userId,
            });
          }

          if (user.quota) {
            export4.data.userQuotas.push({
              createdAt: user.quota.createdAt.toISOString(),
              id: user.quota.id,
              filesQuota: user.quota.filesQuota,
              maxBytes: user.quota.maxBytes,
              maxFiles: user.quota.maxFiles,
              maxUrls: user.quota.maxUrls,
              userId: user.quota.userId,
            });
          }
        }

        const files = await prisma.file.findMany();

        for (const file of files) {
          if (!file.userId)
            logger.warn('file has no user associated with it, still exporting...', {
              fileId: file.id,
              name: file.name,
            });

          export4.data.files.push({
            createdAt: file.createdAt.toISOString(),
            deletesAt: file.deletesAt ? file.deletesAt.toISOString() : null,
            id: file.id,
            name: file.name,
            size: file.size,
            favorite: file.favorite,
            originalName: file.originalName,
            type: file.type,
            views: file.views,
            maxViews: file.maxViews,
            password: file.password,
            userId: file.userId,
            folderId: file.folderId,
          });
        }

        const thumbnails = await prisma.thumbnail.findMany();

        for (const thumbnail of thumbnails) {
          export4.data.thumbnails.push({
            createdAt: thumbnail.createdAt.toISOString(),
            id: thumbnail.id,

            path: thumbnail.path,

            fileId: thumbnail.fileId,
          });
        }

        if (req.query.nometrics === undefined) {
          const metrics = await prisma.metric.findMany();

          export4.data.metrics = metrics.map((metric) => ({
            createdAt: metric.createdAt.toISOString(),
            id: metric.id,
            data: metric.data as Record<string, unknown>,
          }));
        }

        return res
          .header('Content-Disposition', `attachment; filename=zipline4_export_${Date.now()}.json`)
          .type('application/json')
          .send(export4 satisfies Export4);
      },
    );
  },
  { name: PATH },
);
