import { RegistrationResponseJSON } from '@github/webauthn-json/dist/types/browser-ponyfill';
import { Prisma } from '@prisma/client';
import { config } from '@/lib/config';
import { prisma } from '@/lib/db';
import { User } from '@/lib/db/models/user';
import { userMiddleware } from '@/server/middleware/user';
import fastifyPlugin from 'fastify-plugin';

export type ApiUserMfaPasskeyResponse = User | User['passkeys'];

type Body = {
  reg?: RegistrationResponseJSON;
  name?: string;

  id?: string;
};

export const PATH = '/api/user/mfa/passkey';
export default fastifyPlugin(
  (server, _, done) => {
    server.route<{
      Body: Body;
    }>({
      url: PATH,
      method: ['GET', 'POST'],
      preHandler: [userMiddleware],
      handler: async (req, res) => {
        if (!config.mfa.passkeys) return res.badRequest('Passkeys are not enabled');

        if (req.method === 'POST') {
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

          return res.send(user);
        } else if (req.method === 'DELETE') {
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

          return res.send(user);
        }

        return res.send(req.user.passkeys);
      },
    });

    done();
  },
  { name: PATH },
);
