import { config } from '@/lib/config';
import { prisma } from '@/lib/db';
import { User, userSelect } from '@/lib/db/models/user';
import { loginToken } from '@/server/loginToken';
import { AuthenticationResponseJSON } from '@github/webauthn-json/dist/types/browser-ponyfill';
import fastifyPlugin from 'fastify-plugin';

export type ApiAuthWebauthnResponse = {
  user: User;
  token: string;
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

        const token = loginToken(res, user);

        delete (user as any).token;
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
          token,
          user,
        });
      },
    });

    done();
  },
  { name: PATH },
);
