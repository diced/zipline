import { ApiError } from '@/lib/api/errors';
import { ziplineClientParseSchema } from '@/lib/api/detect';
import { config } from '@/lib/config';
import { createToken, hashPassword } from '@/lib/crypto';
import { prisma } from '@/lib/db';
import { userSchema, userSelect } from '@/lib/db/models/user';
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

        const hashedPassword = await hashPassword(password);
        const token = createToken();

        const createUser = (db: Pick<typeof prisma, 'user'>) =>
          db.user.create({
            data: {
              username,
              password: hashedPassword,
              role: 'USER',
              token,
            },
            select: userSelect,
          });

        let user;
        if (code) {
          const result = await prisma.$transaction(async (tx) => {
            const [invite] = await tx.invite.updateManyAndReturn({
              where: {
                AND: [
                  { OR: [{ id: code }, { code }] },
                  { OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
                  {
                    OR: [{ maxUses: null }, { uses: { lt: tx.invite.fields.maxUses } }],
                  },
                ],
              },
              data: { uses: { increment: 1 } },
              select: { id: true },
            });

            if (!invite) throw new ApiError(1035);

            return { inviteId: invite.id, user: await createUser(tx) };
          });

          user = result.user;

          logger.info('invite used', {
            user: username,
            invite: result.inviteId,
          });
        } else {
          user = await createUser(prisma);
        }

        await saveSession(session, user);

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
