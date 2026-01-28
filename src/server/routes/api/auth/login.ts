import { verifyPassword } from '@/lib/crypto';
import { prisma } from '@/lib/db';
import { User, userSelect } from '@/lib/db/models/user';
import { log } from '@/lib/logger';
import { secondlyRatelimit } from '@/lib/ratelimits';
import { verifyTotpCode } from '@/lib/totp';
import { verifyTurnstile } from '@/lib/turnstile';
import { zStringTrimmed } from '@/lib/validation';
import { getSession, saveSession } from '@/server/session';
import typedPlugin from '@/server/typedPlugin';
import z from 'zod';
import { config } from '@/lib/config';

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
          body: z.object({
            username: zStringTrimmed,
            password: zStringTrimmed,
            code: z.string().min(1).optional(),
            turnstileToken: z.string().optional(),
          }),
        },
        ...secondlyRatelimit(2),
      },
      async (req, res) => {
        const session = await getSession(req, res);

        session.id = null;
        session.sessionId = null;

        const { username, password, code, turnstileToken } = req.body;

        // Verify Turnstile CAPTCHA (skip in dev mode)
        if (config.turnstile.enabled && process.env.NODE_ENV !== 'development') {
          if (!turnstileToken) {
            return res.badRequest('CAPTCHA verification required');
          }

          const isValid = await verifyTurnstile(turnstileToken, config.turnstile.secretKey!);
          if (!isValid) {
            return res.badRequest('CAPTCHA verification failed');
          }
        }

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
        if (!user) return res.badRequest('Invalid username or password');
        if (!user.password) return res.badRequest('Invalid username or password');

        const valid = await verifyPassword(password, user.password);
        if (!valid) {
          logger.warn('invalid login attempt', {
            username,
            ip: req.ip ?? 'unknown',
            ua: req.headers['user-agent'],
          });

          return res.badRequest('Invalid username or password');
        }

        if (user.totpSecret && code) {
          const valid = verifyTotpCode(code, user.totpSecret);
          if (!valid) {
            logger.warn('invalid totp code', {
              username,
              ip: req.ip ?? 'unknown',
              ua: req.headers['user-agent'],
            });

            return res.badRequest('Invalid code');
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
