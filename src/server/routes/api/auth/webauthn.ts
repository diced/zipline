import { config } from '@/lib/config';
import { prisma } from '@/lib/db';
import { User, userSelect } from '@/lib/db/models/user';
import { log } from '@/lib/logger';
import { getSession, saveSession } from '@/server/session';
import type { AuthenticationResponseJSON } from '@github/webauthn-json/browser-ponyfill';
import fastifyPlugin from 'fastify-plugin';

export type ApiAuthWebauthnResponse = {
  user: User;
};

type Body = {
  auth: AuthenticationResponseJSON;
};

const logger = log('api').c('auth').c('webauthn');

export const PATH = '/api/auth/webauthn';
export default fastifyPlugin(
  (server, _, done) => {
    server.post<{ Body: Body }>(PATH, async (req, res) => {
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
      if (!user) {
        logger.warn('invalid webauthn attempt', {
          id: auth.id,
        });
        logger.debug('invalid webauthn attempt', {
          request: auth,
        });

        return res.badRequest('Invalid passkey');
      }

      await saveSession(session, user, false);

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

      logger.info('user logged in with passkey', {
        user: user.username,
        passkey: auth.id,
      });

      return res.send({
        user,
      });
    });

    done();
  },
  { name: PATH },
);
