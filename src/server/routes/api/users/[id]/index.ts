import { ApiError } from '@/lib/api/errors';
import { bytes } from '@/lib/bytes';
import { hashPassword } from '@/lib/crypto';
import { datasource } from '@/lib/datasource';
import { db } from '@/lib/db';
import { Role, type UserFilesQuota } from '@/lib/db/enums';
import {
  getUserIdentity,
  getUserSummary,
  type LimitedUser,
  type UserUpdate,
  limitedUserSchema,
} from '@/lib/db/models/user';
import { files, oauthProviders, urls, userQuotas, users } from '@/lib/db/schema';
import { log } from '@/lib/logger';
import { canInteract } from '@/lib/role';
import { zStringTrimmed } from '@/lib/validation';
import { administratorMiddleware } from '@/server/middleware/administrator';
import { userMiddleware } from '@/server/middleware/user';
import typedPlugin from '@/server/typedPlugin';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

export type ApiUsersIdResponse = LimitedUser;

const logger = log('api').c('users').c('[id]');

const paramsSchema = z.object({
  id: z.string(),
});

export const PATH = '/api/users/:id';
export default typedPlugin(
  async (server) => {
    server.get(
      PATH,
      {
        schema: {
          description: 'Fetch a specific user by ID, including their profile and role (admin only).',
          params: paramsSchema,
          response: {
            200: limitedUserSchema,
          },
          tags: ['auth', 'admin'],
        },
        preHandler: [userMiddleware, administratorMiddleware],
      },
      async (req, res) => {
        const user = await getUserSummary(req.params.id);

        if (!user) throw new ApiError(4009);
        if (!canInteract(req.user.role, user.role)) throw new ApiError(4009);

        return res.send(user);
      },
    );

    server.patch(
      PATH,
      {
        schema: {
          description:
            "Update another user's profile, credentials, role, and optional file quota limits (admin only).",
          params: paramsSchema,
          body: z.object({
            username: zStringTrimmed.optional(),
            password: zStringTrimmed.optional(),
            avatar: z.url().optional(),
            role: z.enum(Role).optional(),
            quota: z
              .object({
                filesType: z.enum(['BY_BYTES', 'BY_FILES', 'NONE']).optional(),
                maxFiles: z.number().min(1).nullish(),
                maxBytes: z.string().min(1).nullish(),
                maxUrls: z.number().min(1).nullish(),
              })
              .optional(),
          }),
          response: {
            200: limitedUserSchema,
          },
          tags: ['auth', 'admin'],
        },
        preHandler: [userMiddleware, administratorMiddleware],
      },
      async (req, res) => {
        const user = await getUserIdentity(req.params.id);
        if (!user) throw new ApiError(4009);
        if (!canInteract(req.user.role, user.role)) throw new ApiError(3019);

        const { username, password, avatar, role, quota } = req.body;
        if (role && !canInteract(req.user.role, role)) throw new ApiError(3007);

        let finalQuota:
          | {
              filesQuota?: UserFilesQuota;
              maxFiles?: number | null;
              maxBytes?: string | null;
              maxUrls?: number | null;
            }
          | undefined = undefined;
        if (quota) {
          if (quota.filesType === 'BY_BYTES' && quota.maxBytes === undefined) throw new ApiError(1056);
          if (quota.filesType === 'BY_FILES' && quota.maxFiles === undefined) throw new ApiError(1057);

          finalQuota = {
            ...(quota.filesType === 'BY_BYTES' && {
              filesQuota: 'BY_BYTES',
              maxBytes: bytes(quota.maxBytes || '0') > 0 ? quota.maxBytes : null,
              maxFiles: null,
            }),
            ...(quota.filesType === 'BY_FILES' && {
              filesQuota: 'BY_FILES',
              maxFiles: quota.maxFiles,
              maxBytes: null,
            }),
            ...(quota.filesType === 'NONE' && {
              filesQuota: 'BY_BYTES',
              maxFiles: null,
              maxBytes: null,
            }),
            maxUrls: (quota.maxUrls || 0) > 0 ? quota.maxUrls : null,
          };
        }

        const update: UserUpdate = {
          ...(username && { username }),
          ...(password && { password: await hashPassword(password) }),
          ...(role !== undefined && { role: role || 'USER' }),
          ...(avatar && { avatar }),
        };

        const updatedUser = await db.transaction(async (tx) => {
          if (finalQuota) {
            const [savedQuota] = await tx
              .insert(userQuotas)
              .values({
                userId: user.id,
                filesQuota: finalQuota.filesQuota || 'BY_BYTES',
                maxFiles: finalQuota.maxFiles ?? null,
                maxBytes: finalQuota.maxBytes ?? null,
                maxUrls: finalQuota.maxUrls ?? null,
              })
              .onConflictDoUpdate({ target: userQuotas.userId, set: finalQuota })
              .returning({ id: userQuotas.id });
            if (!savedQuota) throw new ApiError(9005);
          }

          if (Object.keys(update).length) {
            const [updated] = await tx
              .update(users)
              .set(update)
              .where(eq(users.id, user.id))
              .returning({ id: users.id });
            if (!updated) return null;
          }

          return getUserSummary(user.id, tx);
        });
        if (!updatedUser) throw new ApiError(4009);

        logger.info(`${req.user.username} updated another user`, {
          username: updatedUser.username,
          updated: Object.keys(req.body),
        });

        return res.send(updatedUser);
      },
    );

    server.delete(
      PATH,
      {
        schema: {
          description:
            'Delete another user by ID, optionally cascading deletion of their files and URLs (admin only).',
          params: paramsSchema,
          body: z.object({
            delete: z.boolean().optional(),
          }),
          response: {
            200: limitedUserSchema,
          },
          tags: ['auth', 'admin'],
        },
        preHandler: [userMiddleware, administratorMiddleware],
      },
      async (req, res) => {
        const user = await getUserIdentity(req.params.id);

        if (!user) throw new ApiError(4009);
        if (user.id === req.user.id) throw new ApiError(3010);
        if (!canInteract(req.user.role, user.role)) throw new ApiError(3009);

        if (req.body.delete) {
          const fileEntries = await db
            .select({ name: files.name })
            .from(files)
            .where(eq(files.userId, user.id));

          const [filesDeleted, urlsDeleted] = await db.transaction(async (tx) => {
            const deletedFiles = await tx
              .delete(files)
              .where(eq(files.userId, user.id))
              .returning({ id: files.id });
            const deletedUrls = await tx
              .delete(urls)
              .where(eq(urls.userId, user.id))
              .returning({ id: urls.id });
            return [deletedFiles.length, deletedUrls.length] as const;
          });

          logger.debug(`preparing to delete ${fileEntries.length} files from datasource`, {
            username: user.username,
          });

          for (let i = 0; i !== fileEntries.length; ++i) {
            await datasource.delete(fileEntries[i].name);
          }

          logger.info(`${req.user.username} deleted another user's files & urls`, {
            username: user.username,
            deletedFiles: filesDeleted,
            deletedUrls: urlsDeleted,
          });
        }

        const deletedUser = await db.transaction(async (tx) => {
          await tx.delete(oauthProviders).where(eq(oauthProviders.userId, user.id));

          const selected = await getUserSummary(user.id, tx);
          if (!selected) return null;

          const [deleted] = await tx.delete(users).where(eq(users.id, user.id)).returning({ id: users.id });
          return deleted ? selected : null;
        });
        if (!deletedUser) throw new ApiError(4009);

        logger.info(`${req.user.username} deleted another user`, {
          username: deletedUser.username,
          role: deletedUser.role,
        });

        return res.send(deletedUser);
      },
    );
  },
  { name: PATH },
);
