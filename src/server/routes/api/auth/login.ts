import { verifyPassword } from '@/lib/crypto';
import { prisma } from '@/lib/db';
import { User, userSelect } from '@/lib/db/models/user';
import { verifyTotpCode } from '@/lib/totp';
import { loginToken } from '@/server/loginToken';
import fastifyPlugin from 'fastify-plugin';

export type ApiLoginResponse = {
  user?: User;
  token?: string;
  totp?: true;
};

type Body = {
  username: string;
  password: string;
  code?: string;
};

export const PATH = '/api/auth/login';
export default fastifyPlugin(
  (server, _, done) => {
    server.route<{
      Body: Body;
    }>({
      url: PATH,
      method: ['POST'],
      handler: async (req, res) => {
        const { username, password, code } = req.body;

        if (!username) return res.badRequest('Username is required');
        if (!password) return res.badRequest('Password is required');

        const user = await prisma.user.findUnique({
          where: {
            username,
          },
          select: {
            ...userSelect,
            password: true,
            token: true,
          },
        });
        if (!user) return res.badRequest('Invalid username');

        if (!user.password) return res.badRequest('User does not have a password, login through a provider');
        const valid = await verifyPassword(password, user.password);
        if (!valid) return res.badRequest('Invalid password');

        if (user.totpSecret && code) {
          const valid = verifyTotpCode(code, user.totpSecret);
          if (!valid) return res.badRequest('Invalid code');
        }

        if (user.totpSecret && !code)
          return res.send({
            totp: true,
          });

        const token = loginToken(res, user);

        delete (user as any).token;
        delete (user as any).password;

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
