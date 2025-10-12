import { config } from '@/lib/config';
import { prisma } from '@/lib/db';
import { User } from '@/lib/db/models/user';
import { log } from '@/lib/logger';
import { secondlyRatelimit } from '@/lib/ratelimits';
import { userMiddleware } from '@/server/middleware/user';
import type { RegistrationResponseJSON } from '@github/webauthn-json/browser-ponyfill';
import { FastifyReply, FastifyRequest } from 'fastify';
import fastifyPlugin from 'fastify-plugin';
import { Prisma } from '../../../../../../generated/client';

export type ApiUserMfaPasskeyResponse = User | User['passkeys'];

type Body = {
  reg?: RegistrationResponseJSON;
  name?: string;

  id?: string;
};

const logger = log('api').c('user').c('mfa').c('passkey');

const passkeysEnabledHandler = (_: FastifyRequest, res: FastifyReply, done: () => void) => {
  if (!config.mfa.passkeys) {
    return res.badRequest('Passkeys are not enabled');
  }

  done();
};

export const PATH = '/api/user/mfa/passkey';
export default fastifyPlugin(
  (server, _, done) => {
    server.get(PATH, { preHandler: [userMiddleware, passkeysEnabledHandler] }, async (req, res) => {
      return res.send(req.user.passkeys);
    });

    server.post<{ Body: Body }>(
      PATH,
      {
        preHandler: [userMiddleware, passkeysEnabledHandler],
        ...secondlyRatelimit(1),
      },
      async (req, res) => {
        const { reg, name } = req.body;
        if (!reg) return res.badRequest('Missing webauthn response');
        if (!name) return res.badRequest('Missing name');

        const user = await prisma.user.update({
          where: { id: req.user.id },
          data: {
            passkeys: {
              create: {
                name,
                reg: reg as unknown as Prisma.InputJsonValue,
                lastUsed: new Date(),
              },
            },
          },
        });

        logger.info('user created a new passkey', {
          user: user.username,
          name,
          reg: reg.id,
        });

        return res.send(user);
      },
    );

    server.delete<{ Body: Body }>(
      PATH,
      { preHandler: [userMiddleware, passkeysEnabledHandler] },
      async (req, res) => {
        const { id } = req.body;
        if (!id) return res.badRequest('Missing id');

        const user = await prisma.user.update({
          where: { id: req.user.id },
          data: {
            passkeys: {
              delete: { id },
            },
          },
        });

        logger.info('user deleted a passkey', {
          user: user.username,
          id,
        });

        return res.send(user);
      },
    );

    done();
  },
  { name: PATH },
);
