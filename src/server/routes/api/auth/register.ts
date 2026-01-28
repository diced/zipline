import { config } from '@/lib/config';
import { createToken, hashPassword } from '@/lib/crypto';
import { prisma } from '@/lib/db';
import { User, userSelect } from '@/lib/db/models/user';
import { log } from '@/lib/logger';
import { secondlyRatelimit } from '@/lib/ratelimits';
import { verifyTurnstile } from '@/lib/turnstile';
import { getSession, saveSession } from '@/server/session';
import typedPlugin from '@/server/typedPlugin';
import z from 'zod';
import { ApiLoginResponse } from './login';

export type ApiAuthRegisterResponse = ApiLoginResponse;

const logger = log('api').c('auth').c('register');

export const PATH = '/api/auth/register';
export default typedPlugin(
  async (server) => {
    server.post(
      PATH,
      {
        schema: {
          body: z.object({
            username: z.string().min(1),
            password: z.string().min(1),
            code: z.string().min(1).optional(),
            turnstileToken: z.string().optional(),
          }),
        },
        ...secondlyRatelimit(5),
      },
      async (req, res) => {
        const session = await getSession(req, res);

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

        if (code && !config.invites.enabled) return res.badRequest("Invites aren't enabled");
        if (!code && !config.features.userRegistration)
          return res.badRequest('User registration is disabled');

        const oUser = await prisma.user.findUnique({
          where: {
            username,
          },
        });
        if (oUser) return res.badRequest('Username is taken');

        if (code) {
          const invite = await prisma.invite.findFirst({
            where: {
              OR: [{ id: code }, { code }],
            },
          });

          if (!invite) return res.badRequest('Invalid invite code');
          if (invite.expiresAt && new Date(invite.expiresAt) < new Date())
            return res.badRequest('Invalid invite code');
          if (invite.maxUses && invite.uses >= invite.maxUses) return res.badRequest('Invalid invite code');

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
