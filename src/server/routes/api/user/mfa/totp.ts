import { config } from '@/lib/config';
import { prisma } from '@/lib/db';
import { User, userSchema, userSelect } from '@/lib/db/models/user';
import { log } from '@/lib/logger';
import { generateKey, totpQrcode, verifyTotpCode } from '@/lib/totp';
import { userMiddleware } from '@/server/middleware/user';
import typedPlugin from '@/server/typedPlugin';
import { FastifyReply, FastifyRequest } from 'fastify';
import z from 'zod';

export type ApiUserMfaTotpResponse = User | { secret: string } | { secret: string; qrcode: string };

const logger = log('api').c('user').c('mfa').c('totp');

const totpEnabledMiddleware = (_: FastifyRequest, res: FastifyReply, next: () => void) => {
  if (!config.mfa.totp.enabled) return res.badRequest('TOTP is disabled');

  next();
};

export const PATH = '/api/user/mfa/totp';
export default typedPlugin(
  async (server) => {
    server.get(
      PATH,
      {
        schema: {
          response: {
            200: z.union([
              z.object({
                secret: z.string(),
              }),
              z.object({
                secret: z.string(),
                qrcode: z.string(),
              }),
            ]),
          },
        },
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
          body: z.object({
            code: z.string().min(6).max(6),
            secret: z.string(),
          }),
          response: {
            200: userSchema,
          },
        },
        preHandler: [userMiddleware, totpEnabledMiddleware],
      },
      async (req, res) => {
        const { code, secret } = req.body;

        const valid = verifyTotpCode(code, secret);
        if (!valid) return res.badRequest('Invalid code');

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
        if (!req.user.totpSecret) return res.badRequest("You don't have TOTP enabled");

        const { code } = req.body;

        const valid = verifyTotpCode(code, req.user.totpSecret);
        if (!valid) return res.badRequest('Invalid code');

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
