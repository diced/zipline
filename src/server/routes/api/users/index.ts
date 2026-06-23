import { ApiError } from '@/lib/api/errors';
import { config } from '@/lib/config';
import { createToken, hashPassword } from '@/lib/crypto';
import { prisma } from '@/lib/db';
import { LimitedUser, limitedUserSchema, limitedUserSelect } from '@/lib/db/models/user';
import { log } from '@/lib/logger';
import { secondlyRatelimit } from '@/lib/ratelimits';
import { canInteract, interactableRoles } from '@/lib/role';
import { zQsBoolean, zStringTrimmed } from '@/lib/validation';
import { Role } from '@/prisma/client';
import { administratorMiddleware } from '@/server/middleware/administrator';
import { userMiddleware } from '@/server/middleware/user';
import typedPlugin from '@/server/typedPlugin';
import { readFile } from 'fs/promises';
import { z } from 'zod';

export type ApiUsersResponse = LimitedUser[] | LimitedUser;

const logger = log('api').c('users');

const querySchema = z.object({
  noincl: zQsBoolean.default(false),
});

export const PATH = '/api/users';
export default typedPlugin(
  async (server) => {
    server.get(
      PATH,
      {
        schema: {
          description:
            'List users in the instance, optionally excluding the current admin from the results (admin only).',
          querystring: querySchema,
          response: {
            200: z.array(limitedUserSchema),
          },
          tags: ['auth', 'admin'],
        },
        preHandler: [userMiddleware, administratorMiddleware],
      },
      async (req, res) => {
        const roles = interactableRoles(req.user.role);

        const users = await prisma.user.findMany({
          select: {
            ...limitedUserSelect,
            avatar: true,
          },
          where: {
            role: { in: roles },
            ...(req.query.noincl && { id: { not: req.user.id } }),
          },
        });

        return res.send(users);
      },
    );

    server.post(
      PATH,
      {
        schema: {
          description: 'Create a new user with the given username, password, avatar, and role (admin only).',
          querystring: querySchema,
          body: z.object({
            username: zStringTrimmed,
            password: zStringTrimmed,
            avatar: z.string().optional(),
            role: z.enum(Role).default('USER').optional(),
          }),
          response: {
            200: limitedUserSchema,
          },
          tags: ['auth', 'admin'],
        },
        preHandler: [userMiddleware, administratorMiddleware],
        ...secondlyRatelimit(1),
      },
      async (req, res) => {
        const { username, password, avatar, role } = req.body;

        const existing = await prisma.user.findUnique({
          where: {
            username,
          },
        });
        if (existing) throw new ApiError(1040);

        let avatar64 = null;

        try {
          if (config.website.defaultAvatar) {
            avatar64 = (await readFile(config.website.defaultAvatar)).toString('base64');
          } else if (avatar) {
            avatar64 = avatar;
          }
        } catch {
          logger.debug('failed to read default avatar', { path: config.website.defaultAvatar });
        }

        if (role && !canInteract(req.user.role, role)) throw new ApiError(3008);

        const user = await prisma.user.create({
          data: {
            username,
            password: await hashPassword(password),
            role: role,
            avatar: avatar64 ?? null,
            token: createToken(),
          },
          select: limitedUserSelect,
        });

        logger.info(`${req.user.username} created a new user`, {
          username: user.username,
          role: user.role,
        });

        return res.send(user);
      },
    );
  },
  { name: PATH },
);
