import { ApiError } from '@/lib/api/errors';
import { config } from '@/lib/config';
import { db } from '@/lib/db';
import { getUser, updateUser, type User, userSchema } from '@/lib/db/models/user';
import { users } from '@/lib/db/schema';
import { log } from '@/lib/logger';
import { secondlyRatelimit } from '@/lib/ratelimits';
import { generateKey, totpQrcode, verifyTotpCode } from '@/lib/totp';
import { userMiddleware } from '@/server/middleware/user';
import typedPlugin from '@/server/typedPlugin';
import { FastifyReply, FastifyRequest } from 'fastify';
import { and, eq, isNull } from 'drizzle-orm';
import z from 'zod';

const totpEnrollmentSchema = z.object({
  secret: z.string().describe('the TOTP secret key'),
  qrcode: z.string().describe('a data URL for a QR code encoding the secret and account info'),
});

const totpStatusSchema = z.object({
  enabled: z.literal(true),
});

export type ApiUserMfaTotpResponse =
  | User
  | z.infer<typeof totpEnrollmentSchema>
  | z.infer<typeof totpStatusSchema>;

const logger = log('api').c('user').c('mfa').c('totp');

const totpEnabledMiddleware = (_: FastifyRequest, __: FastifyReply, next: () => void) => {
  if (!config.mfa.totp.enabled) throw new ApiError(1054);

  next();
};

export const PATH = '/api/user/mfa/totp';
export default typedPlugin(
  async (server) => {
    server.get(
      PATH,
      {
        schema: {
          description: 'Generate a TOTP enrollment secret, or report that TOTP is already enabled.',
          response: {
            200: z.union([totpEnrollmentSchema, totpStatusSchema]),
          },
          tags: ['auth'],
        },
        ...secondlyRatelimit(5),
        preHandler: [userMiddleware, totpEnabledMiddleware],
      },
      async (req, res) => {
        if (!req.user.totpEnabled) {
          const secret = generateKey();
          const qrcode = await totpQrcode({
            issuer: config.mfa.totp.issuer,
            username: req.user.username,
            secret,
          });

          logger.info('user generated TOTP secret', {
            user: req.user.username,
          });

          return res.send({
            secret,
            qrcode,
          });
        }

        return res.send({
          enabled: true,
        });
      },
    );

    server.post(
      PATH,
      {
        schema: {
          description: 'Enable TOTP for your account by verifying a code for the provided secret.',
          body: z.object({
            code: z.string().min(6).max(6),
            secret: z.string(),
          }),
          response: {
            200: userSchema,
          },
          tags: ['auth'],
        },
        preHandler: [userMiddleware, totpEnabledMiddleware],
      },
      async (req, res) => {
        if (req.user.totpEnabled) throw new ApiError(1069);

        const { code, secret } = req.body;

        const valid = await verifyTotpCode(code, secret);
        if (!valid) throw new ApiError(1045);

        const user = await db.transaction(async (tx) => {
          const [enabled] = await tx
            .update(users)
            .set({ totpSecret: secret })
            .where(and(eq(users.id, req.user.id), isNull(users.totpSecret)))
            .returning({ id: users.id });
          if (!enabled) throw new ApiError(1069);

          const current = await getUser(req.user.id, tx);
          if (!current) throw new ApiError(1069);

          return current;
        });

        logger.info('user enabled TOTP', {
          user: user.username,
        });

        return res.send(user);
      },
    );

    server.delete(
      PATH,
      {
        schema: {
          description: 'Disable TOTP for your account after confirming a valid TOTP code.',
          body: z.object({
            code: z.string().min(6).max(6),
          }),
          response: {
            200: userSchema,
          },
        },
        preHandler: [userMiddleware, totpEnabledMiddleware],
      },
      async (req, res) => {
        if (!req.user.totpEnabled) throw new ApiError(1053);

        const [current] = await db
          .select({ totpSecret: users.totpSecret })
          .from(users)
          .where(eq(users.id, req.user.id));

        if (!current?.totpSecret) throw new ApiError(1053);

        const { code } = req.body;

        const valid = await verifyTotpCode(code, current.totpSecret);
        if (!valid) throw new ApiError(1045);

        const user = await updateUser(req.user.id, { totpSecret: null });
        if (!user) throw new ApiError(1053);

        logger.info('user disabled TOTP', {
          user: user.username,
        });

        return res.send(user);
      },
    );
  },
  { name: PATH },
);
