import { config } from '@/lib/config';
import { createToken, hashPassword } from '@/lib/crypto';
import { prisma } from '@/lib/db';
import { User, userSelect } from '@/lib/db/models/user';
import { getSession, saveSession } from '@/server/session';
import fastifyPlugin from 'fastify-plugin';
import { ApiLoginResponse } from './login';

export type ApiAuthRegisterResponse = ApiLoginResponse;

type Body = {
  username: string;
  password: string;
  code?: string;
};
export const PATH = '/api/auth/register';
export default fastifyPlugin(
  (server, _, done) => {
    server.route<{
      Body: Body;
    }>({
      url: PATH,
      method: ['POST'],
      handler: async (req, res) => {
        const session = await getSession(req, res);

        const { username, password, code } = req.body;

        if (code && !config.invites.enabled) return res.badRequest("Invites aren't enabled");
        if (!code && !config.features.userRegistration)
          return res.badRequest('User registration is disabled');

        if (!username) return res.badRequest('Username is required');
        if (!password) return res.badRequest('Password is required');

        const oUser = await prisma.user.findUnique({
          where: {
            username,
          },
        });
        if (oUser) return res.badRequest('Username is taken');

        if (code) {
          const invite = await prisma.invite.findFirst({
            where: {
              OR: [{ id: code }, { code }],
            },
          });

          if (!invite) return res.badRequest('Invalid invite code');
          if (invite.expiresAt && new Date(invite.expiresAt) < new Date())
            return res.badRequest('Invalid invite code');
          if (invite.maxUses && invite.uses >= invite.maxUses) return res.badRequest('Invalid invite code');

          await prisma.invite.update({
            where: {
              id: invite.id,
            },
            data: {
              uses: invite.uses + 1,
            },
          });
        }

        const user = await prisma.user.create({
          data: {
            username,
            password: await hashPassword(password),
            role: 'USER',
            token: createToken(),
          },
          select: {
            ...userSelect,
            password: true,
            token: true,
          },
        });

        await saveSession(session, <User>user);

        delete (user as any).password;

        return res.send({
          user,
        });
      },
    });

    done();
  },
  { name: PATH },
);
