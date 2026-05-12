import { ApiError } from '@/lib/api/errors';
import { ziplineClientParseSchema } from '@/lib/api/detect';
import { verifyPassword } from '@/lib/crypto';
import { prisma } from '@/lib/db';
import { User, userSchema, userSelect } from '@/lib/db/models/user';
import { log } from '@/lib/logger';
import { secondlyRatelimit } from '@/lib/ratelimits';
import { verifyTotpCode } from '@/lib/totp';
import { zStringTrimmed } from '@/lib/validation';
import { getSession, saveSession } from '@/server/session';
import typedPlugin from '@/server/typedPlugin';
import z from 'zod';

export type ApiLoginResponse = {
  user?: User;
  totp?: true;
};

const logger = log('api').c('auth').c('login');

export const PATH = '/api/auth/login';
export default typedPlugin(
  async (server) => {
    server.post(
      PATH,
      {
        schema: {
          description:
            'Authenticate a user, creating a session and optionally requiring a TOTP code when multi-factor auth is enabled.',
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
              totp: z.literal(true).optional(),
            }),
          },
        },
        ...secondlyRatelimit(2),
      },
      async (req, res) => {
        const session = await getSession(req, res);

        session.id = null;
        session.sessionId = null;

        const { username, password, code } = req.body;

        const user = await prisma.user.findUnique({
          where: {
            username,
          },
          select: {
            ...userSelect,
            password: true,
            token: true,
          },
        });
        if (!user) throw new ApiError(1044);
        if (!user.password) throw new ApiError(1044);

        const valid = await verifyPassword(password, user.password);
        if (!valid) {
          logger.warn('invalid login attempt', {
            username,
            ip: req.ip ?? 'unknown',
            ua: req.headers['user-agent'],
          });

          throw new ApiError(1044);
        }

        if (user.totpSecret && code) {
          const valid = await verifyTotpCode(code, user.totpSecret);
          if (!valid) {
            logger.warn('invalid totp code', {
              username,
              ip: req.ip ?? 'unknown',
              ua: req.headers['user-agent'],
            });

            throw new ApiError(1045);
          }
        }

        if (user.totpSecret && !code)
          return res.send({
            totp: true,
          });

        await saveSession(session, user, false);

        delete (user as any).password;

        logger.info('user logged in successfully', {
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
