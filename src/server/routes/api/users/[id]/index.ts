import { ApiError } from '@/lib/api/errors';
import { bytes } from '@/lib/bytes';
import { hashPassword } from '@/lib/crypto';
import { datasource } from '@/lib/datasource';
import { prisma } from '@/lib/db';
import { LimitedUser, limitedUserSchema, limitedUserSelect } from '@/lib/db/models/user';
import { log } from '@/lib/logger';
import { canInteract } from '@/lib/role';
import { zStringTrimmed } from '@/lib/validation';
import { Role, UserFilesQuota } from '@/prisma/client';
import { administratorMiddleware } from '@/server/middleware/administrator';
import { userMiddleware } from '@/server/middleware/user';
import typedPlugin from '@/server/typedPlugin';
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
        const user = await prisma.user.findUnique({
          where: {
            id: req.params.id,
          },
          select: limitedUserSelect,
        });

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
        const user = await prisma.user.findUnique({
          where: {
            id: req.params.id,
          },
          select: {
            id: true,
            role: true,
          },
        });
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

        const updatedUser = await prisma.user.update({
          where: {
            id: user.id,
          },
          data: {
            ...(username && { username }),
            ...(password && { password: await hashPassword(password) }),
            ...(role !== undefined && { role: role || 'USER' }),
            ...(avatar && { avatar }),
            ...(finalQuota && {
              quota: {
                upsert: {
                  where: {
                    userId: user.id,
                  },
                  create: {
                    filesQuota: finalQuota.filesQuota || 'BY_BYTES',
                    maxFiles: finalQuota.maxFiles ?? null,
                    maxBytes: finalQuota.maxBytes ?? null,
                    maxUrls: finalQuota.maxUrls ?? null,
                  },
                  update: finalQuota,
                },
              },
            }),
          },
          select: limitedUserSelect,
        });

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
        const user = await prisma.user.findUnique({
          where: {
            id: req.params.id,
          },
          select: {
            id: true,
            role: true,
            username: true,
          },
        });

        if (!user) throw new ApiError(4009);
        if (user.id === req.user.id) throw new ApiError(3010);
        if (!canInteract(req.user.role, user.role)) throw new ApiError(3009);

        if (req.body.delete) {
          const files = await prisma.file.findMany({
            where: {
              userId: user.id,
            },
            select: {
              name: true,
            },
          });

          const [{ count: filesDeleted }, { count: urlsDeleted }] = await prisma.$transaction([
            prisma.file.deleteMany({
              where: {
                userId: user.id,
              },
            }),
            prisma.url.deleteMany({
              where: {
                userId: user.id,
              },
            }),
          ]);

          logger.debug(`preparing to delete ${files.length} files from datasource`, {
            username: user.username,
          });

          for (let i = 0; i !== files.length; ++i) {
            await datasource.delete(files[i].name);
          }

          logger.info(`${req.user.username} deleted another user's files & urls`, {
            username: user.username,
            deletedFiles: filesDeleted,
            deletedUrls: urlsDeleted,
          });
        }

        await prisma.oAuthProvider.deleteMany({
          where: {
            userId: user.id,
          },
        });

        const deletedUser = await prisma.user.delete({
          where: {
            id: user.id,
          },
          select: limitedUserSelect,
        });

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
