import { createToken } from '@/lib/crypto';
import { prisma } from '@/lib/db';
import { Export3, validateExport } from '@/lib/import/version3/validateExport';
import { log } from '@/lib/logger';
import { administratorMiddleware } from '@/server/middleware/administrator';
import { userMiddleware } from '@/server/middleware/user';
import fastifyPlugin from 'fastify-plugin';

export type ApiServerImportV3 = {
  users: Record<string, string>;
  files: Record<string, string>;
  folders: Record<string, string>;
  urls: Record<string, string>;
  settings: string[];
};

type Body = {
  export3: Export3;

  importFromUser?: string;
};

const parseDate = (date: string) => (isNaN(Date.parse(date)) ? new Date() : new Date(date));

const logger = log('api').c('server').c('import').c('v3');

export const PATH = '/api/server/import/v3';
export default fastifyPlugin(
  (server, _, done) => {
    server.post<{ Body: Body }>(
      PATH,
      {
        preHandler: [userMiddleware, administratorMiddleware],
        // 24gb, just in case
        bodyLimit: 24 * 1024 * 1024 * 1024,
      },
      async (req, res) => {
        if (req.user.role !== 'SUPERADMIN') return res.forbidden('not super admin');

        const { export3 } = req.body;
        if (!export3) return res.badRequest('missing export3 in request body');

        const validated = validateExport(export3);
        if (!validated.success) {
          logger.error('Failed to validate import data', { error: validated.error });

          return res.status(400).send({
            error: 'Failed to validate import data',
            statusCode: 400,
            details: validated.error.format(),
          });
        }

        // users
        const usersImportedToId: Record<string, string> = {};

        const users = Object.entries(export3.users);
        for (const [id, user] of users) {
          let importFrom = false;
          if (req.body.importFromUser && id === req.body.importFromUser) {
            logger.info('importing to current user', {
              user: req.user.username,
              from: req.body.importFromUser,
            });

            importFrom = true;
          }

          // determines a users role
          const role =
            (user.super_administrator && 'SUPERADMIN') || (user.administrator && 'ADMIN') || 'USER';

          const existing = await prisma.user.findFirst({
            where: {
              username: user.username,
            },
          });

          if (!importFrom && existing) {
            logger.warn('user already exists, skipping importing', {
              id,
              conflict: existing.id,
            });

            continue;
          }

          const oauthProviders = [];
          for (const provider of user.oauth) {
            const existing = await prisma.oAuthProvider.findFirst({
              where: {
                oauthId: provider.oauth_id,
              },
            });

            if (existing) {
              logger.warn('oauth provider already exists, skipping importing', {
                id,
                conflict: existing.id,
              });

              continue;
            }

            oauthProviders.push({
              provider: provider.provider as any,
              accessToken: provider.access_token!,
              refreshToken: provider.refresh_token ?? null,
              oauthId: provider.oauth_id ?? null,
              username: provider.username!,
            });
          }

          if (importFrom) {
            const updated = await prisma.user.update({
              where: {
                id: req.user.id,
              },
              data: {
                avatar: user.avatar ?? null,
                totpSecret: user.totp_secret ?? null,
                ...(user.oauth.length > 0 && {
                  oauthProviders: {
                    createMany: {
                      data: oauthProviders,
                    },
                  },
                }),
              },
            });

            usersImportedToId[id] = updated.id;

            continue;
          }

          const created = await prisma.user.create({
            data: {
              username: user.username,
              password: user.password || null,
              role,
              token: createToken(),
              avatar: user.avatar ?? null,
              totpSecret: user.totp_secret ?? null,
              ...(user.oauth.length > 0 && {
                oauthProviders: {
                  createMany: {
                    data: oauthProviders,
                  },
                },
              }),
            },
          });

          usersImportedToId[id] = created.id;
        }

        logger.debug('imported users', { users: usersImportedToId });

        // files, they are mapped to the users they belong to
        const filesImportedToId: Record<string, string> = {};

        for (const [id, file] of Object.entries(export3.files)) {
          const user = file.user ? usersImportedToId[file.user] : undefined;
          if (!user) {
            logger.warn('failed to find user for file, skipping', { file: id });

            continue;
          }

          const existing = await prisma.file.findFirst({
            where: {
              name: file.name,
            },
          });

          if (existing) {
            logger.warn('file already exists, skipping importing', {
              id,
              conflict: existing.id,
            });

            continue;
          }

          const created = await prisma.file.create({
            data: {
              userId: user,
              name: file.name,
              originalName: file.original_name || null,
              type: file.type,
              size: file.size,
              maxViews: file.max_views || null,
              views: file.views || 0,
              deletesAt: file.expires_at ? parseDate(file.expires_at) : null,
              createdAt: parseDate(file.created_at),
              favorite: file.favorite || false,
              password: file.password || null,
            },
          });

          filesImportedToId[id] = created.id;
        }

        logger.debug('imported files', { files: filesImportedToId });

        // folders, they are mapped to the users they belong to + files they contain
        const foldersImportedToId: Record<string, string> = {};

        for (const [id, folder] of Object.entries(export3.folders)) {
          const user = folder.user ? usersImportedToId[folder.user] : undefined;
          if (!user) {
            logger.warn('failed to find user for folder, skipping', { folder: id });

            continue;
          }

          const files = folder.files.map((file) => filesImportedToId[file]).filter(Boolean);
          if (files.length !== folder.files.length) {
            logger.warn('failed to find all files for folder, skipping', { folder: id });

            continue;
          }

          const created = await prisma.folder.create({
            data: {
              userId: user,
              name: folder.name,
              public: folder.public,
              createdAt: parseDate(folder.created_at),
              files: {
                connect: folder.files.map((file) => ({
                  id: filesImportedToId[file],
                })),
              },
            },
          });

          foldersImportedToId[id] = created.id;
        }

        logger.debug('imported folders', { folders: foldersImportedToId });

        // urls, they are mapped to the users they belong to
        const urlsImportedToId: Record<string, string> = {};

        for (const [id, url] of Object.entries(export3.urls)) {
          const user = url.user ? usersImportedToId[url.user] : undefined;
          if (!user) {
            logger.warn('failed to find user for url, skipping', { url: id });

            continue;
          }

          const existing = await prisma.url.findFirst({
            where: {
              code: url.code,
            },
          });

          if (existing) {
            logger.warn('url already exists, skipping importing', {
              id,
              conflict: existing.id,
            });

            continue;
          }

          const created = await prisma.url.create({
            data: {
              userId: user,
              destination: url.destination,
              vanity: url.vanity || null,
              code: url.code,
              maxViews: url.max_views || null,
              views: url.views || 0,
              createdAt: parseDate(url.created_at),
            },
          });

          urlsImportedToId[id] = created.id;
        }

        logger.debug('imported urls', { urls: urlsImportedToId });

        logger.info('imported all data from export', {
          exportFrom: export3.request.date,
          importedAt: new Date(),
          users: Object.keys(usersImportedToId).length,
          files: Object.keys(filesImportedToId).length,
          folders: Object.keys(foldersImportedToId).length,
          urls: Object.keys(urlsImportedToId).length,
        });

        return res.send({
          users: usersImportedToId,
          files: filesImportedToId,
          folders: foldersImportedToId,
          urls: urlsImportedToId,
        });
      },
    );

    done();
  },
  { name: PATH },
);
