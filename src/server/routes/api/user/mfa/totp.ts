import { ApiError } from '@/lib/api/errors';
import { config } from '@/lib/config';
import { prisma } from '@/lib/db';
import { User, userSchema, userSelect } from '@/lib/db/models/user';
import { log } from '@/lib/logger';
import { secondlyRatelimit } from '@/lib/ratelimits';
import { generateKey, totpQrcode, verifyTotpCode } from '@/lib/totp';
import { userMiddleware } from '@/server/middleware/user';
import typedPlugin from '@/server/typedPlugin';
import { FastifyReply, FastifyRequest } from 'fastify';
import z from 'zod';

export type ApiUserMfaTotpResponse = User | { secret: string } | { secret: string; qrcode: string };

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
          description: 'Get your current TOTP secret, generating one (and a QR code) if not yet enabled.',
          response: {
            200: z.object({
              secret: z
                .string()
                .describe('the TOTP secret key, used to generate codes in an authenticator app'),
              qrcode: z
                .string()
                .nullish()
                .describe(
                  "if the user hasn't enabled TOTP yet, a data URL for a QR code encoding the secret and account info",
                ),
            }),
          },
          tags: ['auth'],
        },
        ...secondlyRatelimit(5),
        preHandler: [userMiddleware, totpEnabledMiddleware],
      },
      async (req, res) => {
        if (!req.user.totpSecret) {
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
          secret: req.user.totpSecret,
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
        const { code, secret } = req.body;

        const valid = await verifyTotpCode(code, secret);
        if (!valid) throw new ApiError(1045);

        const user = await prisma.user.update({
          where: { id: req.user.id },
          data: { totpSecret: secret },
          select: userSelect,
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
        if (!req.user.totpSecret) throw new ApiError(1053);

        const { code } = req.body;

        const valid = await verifyTotpCode(code, req.user.totpSecret);
        if (!valid) throw new ApiError(1045);

        const user = await prisma.user.update({
          where: { id: req.user.id },
          data: { totpSecret: null },
          select: userSelect,
        });

        logger.info('user disabled TOTP', {
          user: user.username,
        });

        return res.send(user);
      },
    );
  },
  { name: PATH },
);
