import { ApiError } from '@/lib/api/errors';
import { createToken } from '@/lib/crypto';
import {
  createImportFile,
  createImportUrl,
  createV3ImportFolder,
  createV3ImportUser,
  findImportFileByName,
  findImportOauthProviderByOauthId,
  findImportUrlByCode,
  findImportUserByUsername,
  type ImportedOauthProviderInput,
  updateV3ImportUser,
} from '@/lib/db/models/serverData';
import { sanitizeFilename } from '@/lib/fs';
import { export3Schema } from '@/lib/import/version3/validateExport';
import { log } from '@/lib/logger';
import { randomCharacters } from '@/lib/random';
import { secondlyRatelimit } from '@/lib/ratelimits';
import { administratorMiddleware } from '@/server/middleware/administrator';
import { userMiddleware } from '@/server/middleware/user';
import typedPlugin from '@/server/typedPlugin';
import z from 'zod';

export type ApiServerImportV3 = z.infer<typeof serverImportSchema>;

const serverImportSchema = z.object({
  users: z.record(z.string(), z.string()),
  files: z.record(z.string(), z.string()),
  folders: z.record(z.string(), z.string()),
  urls: z.record(z.string(), z.string()),
});

const parseDate = (date: string) => (isNaN(Date.parse(date)) ? new Date() : new Date(date));

const logger = log('api').c('server').c('import').c('v3');

export const PATH = '/api/server/import/v3';
export default typedPlugin(
  async (server) => {
    server.post(
      PATH,
      {
        schema: {
          description:
            'Import data from a legacy Zipline v3 export file, creating users, files, folders and URLs and returning a mapping of old IDs to new IDs.',
          body: z.object({
            export3: export3Schema.required(),
            importFromUser: z.string().optional(),
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

        const { export3 } = req.body;

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

          const existing = await findImportUserByUsername(user.username);

          if (!importFrom && existing) {
            logger.warn('user already exists, skipping importing', {
              id,
              conflict: existing.id,
            });

            continue;
          }

          const oauthProviders: ImportedOauthProviderInput[] = [];
          for (const provider of user.oauth) {
            const existing = await findImportOauthProviderByOauthId(provider.oauth_id);

            if (existing) {
              logger.warn('oauth provider already exists, skipping importing', {
                id,
                conflict: existing.id,
              });

              continue;
            }

            oauthProviders.push({
              provider: provider.provider,
              accessToken: provider.access_token as string,
              refreshToken: provider.refresh_token ?? null,
              oauthId: provider.oauth_id ?? null,
              username: provider.username,
            });
          }

          if (importFrom) {
            const updated = await updateV3ImportUser(
              req.user.id,
              {
                avatar: user.avatar ?? null,
                totpSecret: user.totp_secret ?? null,
              },
              oauthProviders,
            );

            usersImportedToId[id] = updated.id;

            continue;
          }

          const created = await createV3ImportUser(
            {
              username: user.username,
              password: user.password || null,
              role,
              token: createToken(),
              avatar: user.avatar ?? null,
              totpSecret: user.totp_secret ?? null,
            },
            oauthProviders,
          );

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

          const existing = await findImportFileByName(file.name);

          if (existing) {
            logger.warn('file already exists, skipping importing', {
              id,
              conflict: existing.id,
            });

            continue;
          }

          let sanitizedFilename = sanitizeFilename(file.name);
          if (!sanitizedFilename) {
            sanitizedFilename = randomCharacters(12);
            logger.warn('file has invalid name, using random name', { file: id, new: sanitizedFilename });
          }

          const created = await createImportFile({
            userId: user,
            name: sanitizedFilename,
            originalName: file.original_name || null,
            type: file.type,
            size: Number(file.size),
            maxViews: file.max_views || null,
            views: file.views || 0,
            deletesAt: file.expires_at ? parseDate(file.expires_at) : null,
            createdAt: parseDate(file.created_at),
            favorite: file.favorite || false,
            password: file.password || null,
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

          const created = await createV3ImportFolder({
            userId: user,
            name: folder.name,
            public: folder.public,
            createdAt: parseDate(folder.created_at),
            fileIds: folder.files.map((file) => filesImportedToId[file]),
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

          const existing = await findImportUrlByCode(url.code);

          if (existing) {
            logger.warn('url already exists, skipping importing', {
              id,
              conflict: existing.id,
            });

            continue;
          }

          const created = await createImportUrl({
            userId: user,
            destination: url.destination,
            vanity: url.vanity || null,
            code: url.code,
            maxViews: url.max_views || null,
            views: url.views || 0,
            createdAt: parseDate(url.created_at),
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
        } satisfies ApiServerImportV3);
      },
    );
  },
  { name: PATH },
);
