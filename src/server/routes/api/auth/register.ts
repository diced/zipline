import { ApiError } from '@/lib/api/errors';
import { ziplineClientParseSchema } from '@/lib/api/detect';
import { config } from '@/lib/config';
import { createToken, hashPassword } from '@/lib/crypto';
import { prisma } from '@/lib/db';
import { User, userSchema, userSelect } from '@/lib/db/models/user';
import { log } from '@/lib/logger';
import { secondlyRatelimit } from '@/lib/ratelimits';
import { getSession, saveSession } from '@/server/session';
import typedPlugin from '@/server/typedPlugin';
import z from 'zod';
import { ApiLoginResponse } from './login';
import { zStringTrimmed } from '@/lib/validation';

export type ApiAuthRegisterResponse = ApiLoginResponse;

const logger = log('api').c('auth').c('register');

export const PATH = '/api/auth/register';
export default typedPlugin(
  async (server) => {
    server.post(
      PATH,
      {
        schema: {
          description:
            'Register a new user account and immediately authenticate them, optionally consuming an invite code.',
          body: z.object({
            username: zStringTrimmed,
            password: zStringTrimmed,
            code: z.string().min(1).optional(),
          }),
          headers: z.object({
            'x-zipline-client': ziplineClientParseSchema.optional(),
          }),
          response: {
            200: z.object({
              user: userSchema.optional(),
            }),
          },
        },
        ...secondlyRatelimit(5),
      },
      async (req, res) => {
        const session = await getSession(req, res);

        const { username, password, code } = req.body;

        if (code && !config.invites.enabled) throw new ApiError(1036);
        if (!code && !config.features.userRegistration) throw new ApiError(1037);

        const oUser = await prisma.user.findUnique({
          where: {
            username,
          },
        });
        if (oUser) throw new ApiError(1039);

        if (code) {
          const invite = await prisma.invite.findFirst({
            where: {
              OR: [{ id: code }, { code }],
            },
          });

          if (!invite) throw new ApiError(1035);
          if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) throw new ApiError(1035);
          if (invite.maxUses && invite.uses >= invite.maxUses) throw new ApiError(1035);

          await prisma.invite.update({
            where: {
              id: invite.id,
            },
            data: {
              uses: invite.uses + 1,
            },
          });

          logger.info('invite used', {
            user: username,
            invite: invite.id,
          });
        }

        const user = await prisma.user.create({
          data: {
            username,
            password: await hashPassword(password),
            role: 'USER',
            token: createToken(),
          },
          select: {
            ...userSelect,
            password: true,
            token: true,
          },
        });

        await saveSession(session, <User>user);

        delete (user as any).password;

        logger.info('user registered successfully', {
          username,
          ip: req.ip ?? 'unknown',
          ua: req.headers['user-agent'],
        });

        return res.send({
          user,
        });
      },
    );
  },
  { name: PATH },
);
