import { verifyPassword } from '@/lib/crypto';
import { prisma } from '@/lib/db';
import { log } from '@/lib/logger';
import { userMiddleware } from '@/server/middleware/user';
import fastifyPlugin from 'fastify-plugin';

export type ApiUserUrlsIdPasswordResponse = {
  success: boolean;
};

type Body = {
  password: string;
};

type Params = {
  id: string;
};

const logger = log('api').c('user').c('urls').c('[id]').c('password');

export const PATH = '/api/user/urls/:id/password';
export default fastifyPlugin(
  (server, _, done) => {
    server.post<{ Params: Params; Body: Body }>(PATH, { preHandler: [userMiddleware] }, async (req, res) => {
      const url = await prisma.url.findFirst({
        where: {
          OR: [{ id: req.params.id }, { code: req.params.id }, { vanity: req.params.id }],
        },
        select: {
          password: true,
          id: true,
        },
      });
      if (!url) return res.notFound();
      if (!url.password) return res.notFound();

      const verified = await verifyPassword(req.body.password, url.password);
      if (!verified) return res.forbidden('Incorrect password');

      logger.info(`url ${url.id} was accessed with the correct password`, { ua: req.headers['user-agent'] });

      return res.send({ success: true });
    });

    done();
  },
  { name: PATH },
);
