import { ApiError } from '@/lib/api/errors';
import { createToken } from '@/lib/crypto';
import { db } from '@/lib/db';
import { files, folders, oauthProviders, urls, users } from '@/lib/db/schema';
import { sanitizeFilename } from '@/lib/fs';
import { export3Schema } from '@/lib/import/version3/validateExport';
import { log } from '@/lib/logger';
import { randomCharacters } from '@/lib/random';
import { secondlyRatelimit } from '@/lib/ratelimits';
import { administratorMiddleware } from '@/server/middleware/administrator';
import { userMiddleware } from '@/server/middleware/user';
import typedPlugin from '@/server/typedPlugin';
import { eq, inArray, isNull } from 'drizzle-orm';
import z from 'zod';

export type ApiServerImportV3 = z.infer<typeof serverImportSchema>;

const serverImportSchema = z.object({
  users: z.record(z.string(), z.string()),
  files: z.record(z.string(), z.string()),
  folders: z.record(z.string(), z.string()),
  urls: z.record(z.string(), z.string()),
});

const parseDate = (date: string) => (isNaN(Date.parse(date)) ? new Date() : new Date(date));

type ImportOauthProvider = Pick<
  typeof oauthProviders.$inferInsert,
  'provider' | 'accessToken' | 'refreshToken' | 'oauthId' | 'username'
>;

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
        bodyLimit: 24 * 1024 * 1024 * 1024,
        ...secondlyRatelimit(5),
      },
      async (req, res) => {
        if (req.user.role !== 'SUPERADMIN') throw new ApiError(3015);

        const { export3 } = req.body;

        const usersImportedToId: Record<string, string> = {};

        const userEntries = Object.entries(export3.users);
        for (const [id, user] of userEntries) {
          let importFrom = false;
          if (req.body.importFromUser && id === req.body.importFromUser) {
            logger.info('importing to current user', {
              user: req.user.username,
              from: req.body.importFromUser,
            });

            importFrom = true;
          }

          const role =
            (user.super_administrator && 'SUPERADMIN') || (user.administrator && 'ADMIN') || 'USER';

          const [existing] = await db
            .select({ id: users.id })
            .from(users)
            .where(eq(users.username, user.username))
            .limit(1);

          if (!importFrom && existing) {
            logger.warn('user already exists, skipping importing', {
              id,
              conflict: existing.id,
            });

            continue;
          }

          const importedProviders: ImportOauthProvider[] = [];
          for (const provider of user.oauth) {
            const [existing] = await db
              .select({ id: oauthProviders.id })
              .from(oauthProviders)
              .where(
                provider.oauth_id === null
                  ? isNull(oauthProviders.oauthId)
                  : eq(oauthProviders.oauthId, provider.oauth_id),
              )
              .limit(1);

            if (existing) {
              logger.warn('oauth provider already exists, skipping importing', {
                id,
                conflict: existing.id,
              });

              continue;
            }

            importedProviders.push({
              provider: provider.provider,
              accessToken: provider.access_token as string,
              refreshToken: provider.refresh_token ?? null,
              oauthId: provider.oauth_id ?? null,
              username: provider.username,
            });
          }

          if (importFrom) {
            const updated = await db.transaction(async (tx) => {
              const [updated] = await tx
                .update(users)
                .set({ avatar: user.avatar ?? null, totpSecret: user.totp_secret ?? null })
                .where(eq(users.id, req.user.id))
                .returning({ id: users.id });
              if (!updated) throw new ApiError(9005);

              if (importedProviders.length) {
                await tx
                  .insert(oauthProviders)
                  .values(importedProviders.map((provider) => ({ ...provider, userId: req.user.id })));
              }

              return updated;
            });

            usersImportedToId[id] = updated.id;

            continue;
          }

          const created = await db.transaction(async (tx) => {
            const [created] = await tx
              .insert(users)
              .values({
                username: user.username,
                password: user.password || null,
                role,
                token: createToken(),
                avatar: user.avatar ?? null,
                totpSecret: user.totp_secret ?? null,
              })
              .returning({ id: users.id });
            if (!created) throw new ApiError(9005);

            if (importedProviders.length) {
              await tx
                .insert(oauthProviders)
                .values(importedProviders.map((provider) => ({ ...provider, userId: created.id })));
            }

            return created;
          });

          usersImportedToId[id] = created.id;
        }

        logger.debug('imported users', { users: usersImportedToId });

        const filesImportedToId: Record<string, string> = {};

        for (const [id, file] of Object.entries(export3.files)) {
          const user = file.user ? usersImportedToId[file.user] : undefined;
          if (!user) {
            logger.warn('failed to find user for file, skipping', { file: id });

            continue;
          }

          const [existing] = await db
            .select({ id: files.id })
            .from(files)
            .where(eq(files.name, file.name))
            .limit(1);

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

          const [created] = await db
            .insert(files)
            .values({
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
            })
            .returning({ id: files.id });
          if (!created) throw new ApiError(9005);

          filesImportedToId[id] = created.id;
        }

        logger.debug('imported files', { files: filesImportedToId });

        const foldersImportedToId: Record<string, string> = {};

        for (const [id, folder] of Object.entries(export3.folders)) {
          const user = folder.user ? usersImportedToId[folder.user] : undefined;
          if (!user) {
            logger.warn('failed to find user for folder, skipping', { folder: id });

            continue;
          }

          const mappedFileIds = folder.files.map((file) => filesImportedToId[file]).filter(Boolean);
          if (mappedFileIds.length !== folder.files.length) {
            logger.warn('failed to find all files for folder, skipping', { folder: id });

            continue;
          }

          const fileIds = [...new Set(mappedFileIds)];
          const created = await db.transaction(async (tx) => {
            const [created] = await tx
              .insert(folders)
              .values({
                userId: user,
                name: folder.name,
                public: folder.public,
                createdAt: parseDate(folder.created_at),
              })
              .returning({ id: folders.id });
            if (!created) throw new ApiError(9005);

            if (fileIds.length) {
              const updatedFiles = await tx
                .update(files)
                .set({ folderId: created.id })
                .where(inArray(files.id, fileIds))
                .returning({ id: files.id });
              if (updatedFiles.length !== fileIds.length) throw new ApiError(9005);
            }

            return created;
          });

          foldersImportedToId[id] = created.id;
        }

        logger.debug('imported folders', { folders: foldersImportedToId });

        const urlsImportedToId: Record<string, string> = {};

        for (const [id, url] of Object.entries(export3.urls)) {
          const user = url.user ? usersImportedToId[url.user] : undefined;
          if (!user) {
            logger.warn('failed to find user for url, skipping', { url: id });

            continue;
          }

          const [existing] = await db
            .select({ id: urls.id })
            .from(urls)
            .where(eq(urls.code, url.code))
            .limit(1);

          if (existing) {
            logger.warn('url already exists, skipping importing', {
              id,
              conflict: existing.id,
            });

            continue;
          }

          const [created] = await db
            .insert(urls)
            .values({
              userId: user,
              destination: url.destination,
              vanity: url.vanity || null,
              code: url.code,
              maxViews: url.max_views || null,
              views: url.views || 0,
              createdAt: parseDate(url.created_at),
            })
            .returning({ id: urls.id });
          if (!created) throw new ApiError(9005);

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
