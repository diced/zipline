import { config } from '@/lib/config';
import { prisma } from '@/lib/db';
import { User, userSelect } from '@/lib/db/models/user';
import { generateKey, totpQrcode, verifyTotpCode } from '@/lib/totp';
import { userMiddleware } from '@/server/middleware/user';
import fastifyPlugin from 'fastify-plugin';

export type ApiUserMfaTotpResponse = User | { secret: string } | { secret: string; qrcode: string };

type Body = {
  code?: string;
  secret?: string;
};

export const PATH = '/api/user/mfa/totp';
export default fastifyPlugin(
  (server, _, done) => {
    server.route<{
      Body: Body;
    }>({
      url: PATH,
      method: ['GET', 'POST', 'DELETE'],
      preHandler: [userMiddleware],
      handler: async (req, res) => {
        if (!config.mfa.totp.enabled) return res.badRequest('TOTP is disabled');

        if (req.method === 'DELETE') {
          if (!req.user.totpSecret) return res.badRequest("You don't have TOTP enabled");

          const { code } = req.body;
          if (!code) return res.badRequest('Missing code');
          if (code.length !== 6) return res.badRequest('Invalid code');

          const valid = verifyTotpCode(code, req.user.totpSecret);
          if (!valid) return res.badRequest('Invalid code');

          const user = await prisma.user.update({
            where: { id: req.user.id },
            data: { totpSecret: null },
            select: userSelect,
          });

          return res.send(user);
        } else if (req.method === 'POST') {
          const { code, secret } = req.body;
          if (!code) return res.badRequest('Missing code');
          if (code.length !== 6) return res.badRequest('Invalid code');

          if (!secret) return res.badRequest('Missing secret');

          const valid = verifyTotpCode(code, secret);
          if (!valid) return res.badRequest('Invalid code');

          const user = await prisma.user.update({
            where: { id: req.user.id },
            data: { totpSecret: secret },
            select: userSelect,
          });

          return res.send(user);
        }

        if (!req.user.totpSecret) {
          const secret = generateKey();
          const qrcode = await totpQrcode({
            issuer: config.mfa.totp.issuer,
            username: req.user.username,
            secret,
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
    });

    done();
  },
  { name: PATH },
);
