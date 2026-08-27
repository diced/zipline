import { ziplineClientParseSchema } from '@/lib/api/detect';
import { ApiError } from '@/lib/api/errors';
import { config } from '@/lib/config';
import { createToken, hashPassword } from '@/lib/crypto';
import { db } from '@/lib/db';
import { createUser, userSchema } from '@/lib/db/models/user';
import { invites, users } from '@/lib/db/schema';
import { log } from '@/lib/logger';
import { secondlyRatelimit } from '@/lib/ratelimits';
import { zStringTrimmed } from '@/lib/validation';
import { getSession, saveSession } from '@/server/session';
import typedPlugin from '@/server/typedPlugin';
import { and, eq, gt, isNull, lt, or, sql } from 'drizzle-orm';
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

        const [usernameTaken] = await db.select().from(users).where(eq(users.username, username)).limit(1);
        if (usernameTaken) throw new ApiError(1039);

        const hashedPassword = await hashPassword(password);
        const token = createToken();

        const result = await db.transaction(async (tx) => {
          let inviteId: string | undefined;
          if (code) {
            const [invite] = await tx
              .update(invites)
              .set({ uses: sql`${invites.uses} + 1` })
              .where(
                and(
                  or(eq(invites.id, code), eq(invites.code, code)),
                  or(isNull(invites.expiresAt), gt(invites.expiresAt, new Date())),
                  or(isNull(invites.maxUses), lt(invites.uses, invites.maxUses)),
                ),
              )
              .returning({ id: invites.id });

            if (!invite) throw new ApiError(1035);
            inviteId = invite.id;
          }

          const user = await createUser(
            {
              username,
              password: hashedPassword,
              role: 'USER',
              token,
            },
            tx,
          );

          return { inviteId, user };
        });

        if (result.inviteId) {
          logger.info('invite used', {
            user: username,
            invite: result.inviteId,
          });
        }

        await saveSession(session, result.user);

        logger.info('user registered successfully', {
          username,
          ip: req.ip ?? 'unknown',
          ua: req.headers['user-agent'],
        });

        return res.send({
          user: result.user,
        });
      },
    );
  },
  { name: PATH },
);
