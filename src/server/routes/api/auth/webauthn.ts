import { config } from '@/lib/config';
import { prisma } from '@/lib/db';
import { User, userSelect } from '@/lib/db/models/user';
import { getSession, saveSession } from '@/server/session';
import { AuthenticationResponseJSON } from '@github/webauthn-json/dist/types/browser-ponyfill';
import fastifyPlugin from 'fastify-plugin';

export type ApiAuthWebauthnResponse = {
  user: User;
};

type Body = {
  auth: AuthenticationResponseJSON;
};

export const PATH = '/api/auth/webauthn';
export default fastifyPlugin(
  (server, _, done) => {
    server.route<{
      Body: Body;
    }>({
      url: PATH,
      method: ['POST'],
      handler: async (req, res) => {
        const session = await getSession(req, res);
        if (!config.mfa.passkeys) return res.badRequest('Passkeys are not enabled');

        const { auth } = req.body;
        if (!auth) return res.badRequest('Missing webauthn payload');

        const user = await prisma.user.findFirst({
          where: {
            passkeys: {
              some: {
                reg: {
                  path: ['id'],
                  equals: auth.id,
                },
              },
            },
          },
          select: {
            ...userSelect,
            password: true,
            token: true,
          },
        });
        if (!user) return res.badRequest('Invalid passkey');

        await saveSession(session, user);

        delete (user as any).password;

        await prisma.userPasskey.updateMany({
          where: {
            reg: {
              path: ['id'],
              equals: auth.id,
            },
          },
          data: {
            lastUsed: new Date(),
          },
        });

        return res.send({
          user,
        });
      },
    });

    done();
  },
  { name: PATH },
);
