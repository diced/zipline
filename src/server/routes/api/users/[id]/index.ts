import { bytes } from '@/lib/bytes';
import { hashPassword } from '@/lib/crypto';
import { datasource } from '@/lib/datasource';
import { prisma } from '@/lib/db';
import { User, userSelect } from '@/lib/db/models/user';
import { log } from '@/lib/logger';
import { canInteract } from '@/lib/role';
import { Role, UserFilesQuota } from '@/prisma/client';
import { administratorMiddleware } from '@/server/middleware/administrator';
import { userMiddleware } from '@/server/middleware/user';
import typedPlugin from '@/server/typedPlugin';
import { getFilePath } from '@/lib/datasource/helpers';
import { z } from 'zod';

export type ApiUsersIdResponse = User;

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
        schema: { params: paramsSchema },
        preHandler: [userMiddleware, administratorMiddleware],
      },
      async (req, res) => {
        const user = await prisma.user.findUnique({
          where: {
            id: req.params.id,
          },
          select: userSelect,
        });

        if (!user) return res.notFound('User not found');

        return res.send(user);
      },
    );

    server.patch(
      PATH,
      {
        schema: {
          params: paramsSchema,
          body: z.object({
            username: z.string().min(1).optional(),
            password: z.string().min(1).optional(),
            avatar: z.url().optional(),
            role: z.enum(Role).optional(),
            quota: z
              .object({
                filesType: z.enum(['BY_BYTES', 'BY_FILES', 'NONE']).optional(),
                maxFiles: z.number().min(1).optional(),
                maxBytes: z.string().min(1).optional(),
                maxUrls: z.number().min(1).optional(),
              })
              .optional(),
          }),
        },
        preHandler: [userMiddleware, administratorMiddleware],
      },
      async (req, res) => {
        const user = await prisma.user.findUnique({
          where: {
            id: req.params.id,
          },
          select: userSelect,
        });
        if (!user) return res.notFound('User not found');

        const { username, password, avatar, role, quota } = req.body;
        if (role && !canInteract(req.user.role, role)) return res.forbidden('You cannot assign this role');

        let finalQuota:
          | {
              filesQuota?: UserFilesQuota;
              maxFiles?: number | null;
              maxBytes?: string | null;
              maxUrls?: number | null;
            }
          | undefined = undefined;
        if (quota) {
          if (quota.filesType === 'BY_BYTES' && quota.maxBytes === undefined)
            return res.badRequest('maxBytes is required');
          if (quota.filesType === 'BY_FILES' && quota.maxFiles === undefined)
            return res.badRequest('maxFiles is required');

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
          select: {
            ...userSelect,
            totpSecret: false,
            passkeys: false,
          },
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
          params: paramsSchema,
          body: z.object({
            delete: z.boolean().optional().describe('delete everything associated with the user'),
          }),
        },
        preHandler: [userMiddleware, administratorMiddleware],
      },
      async (req, res) => {
        const user = await prisma.user.findUnique({
          where: {
            id: req.params.id,
          },
          select: userSelect,
        });

        if (!user) return res.notFound('User not found');
        if (user.id === req.user.id) return res.forbidden('You cannot delete yourself');
        if (!canInteract(req.user.role, user.role)) return res.forbidden('You cannot delete this user');

        if (req.body.delete) {
          const files = await prisma.file.findMany({
            where: {
              userId: user.id,
            },
            select: {
              name: true,
              type: true,
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
            await datasource.delete(
              getFilePath({
                userId: user.id,
                type: files[i].type,
                name: files[i].name,
              }),
            );
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
          select: {
            ...userSelect,
            totpSecret: false,
          },
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
