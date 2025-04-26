import { verifyPassword } from '@/lib/crypto';
import { prisma } from '@/lib/db';
import { User, userSelect } from '@/lib/db/models/user';
import { log } from '@/lib/logger';
import { verifyTotpCode } from '@/lib/totp';
import { getSession, saveSession } from '@/server/session';
import fastifyPlugin from 'fastify-plugin';

export type ApiLoginResponse = {
  user?: User;
  totp?: true;
};

type Body = {
  username: string;
  password: string;
  code?: string;
};

const logger = log('api').c('auth').c('login');

export const PATH = '/api/auth/login';
export default fastifyPlugin(
  (server, _, done) => {
    server.route<{
      Body: Body;
    }>({
      url: PATH,
      method: ['POST'],
      handler: async (req, res) => {
        const session = await getSession(req, res);

        session.id = null;
        session.sessionId = null;

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
        if (!valid) {
          logger.warn('invalid login attempt', {
            username,
            ip: req.ip ?? 'unknown',
            ua: req.headers['user-agent'],
          });
          return res.badRequest('Invalid password');
        }

        if (user.totpSecret && code) {
          const valid = verifyTotpCode(code, user.totpSecret);
          if (!valid) {
            logger.warn('invalid totp code', {
              username,
              ip: req.ip ?? 'unknown',
              ua: req.headers['user-agent'],
            });

            return res.badRequest('Invalid code');
          }
        }

        if (user.totpSecret && !code)
          return res.send({
            totp: true,
          });

        await saveSession(session, user, false);

        delete (user as any).password;

        const rootFolder = await prisma.folder.findUnique({
          where: {
            id: "root",
          },
        });
        if (!rootFolder) {
          console.log(user.id);
          await prisma.folder.create({
            data: {
              id: "root",
              name: "Files",
              userId: user.id,
              public: false,
              parentFolderId: '',
            }
          });
        }

        logger.info('user logged in successfully', {
          username,
          ip: req.ip ?? 'unknown',
          ua: req.headers['user-agent'],
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
