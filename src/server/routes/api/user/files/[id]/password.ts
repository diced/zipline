import { verifyPassword } from '@/lib/crypto';
import { prisma } from '@/lib/db';
import { log } from '@/lib/logger';
import { userMiddleware } from '@/server/middleware/user';
import fastifyPlugin from 'fastify-plugin';

export type ApiUserFilesIdPasswordResponse = {
  success: boolean;
};

type Body = {
  password: string;
};

type Params = {
  id: string;
};

const logger = log('api').c('user').c('files').c('[id]').c('password');

export const PATH = '/api/user/files/:id/password';
export default fastifyPlugin(
  (server, _, done) => {
    server.route<{
      Body: Body;
      Params: Params;
    }>({
      url: PATH,
      method: ['POST'],
      preHandler: [userMiddleware],
      handler: async (req, res) => {
        const file = await prisma.file.findFirst({
          where: {
            OR: [{ id: req.params.id }, { name: req.params.id }],
          },
          select: {
            name: true,
            password: true,
          },
        });
        if (!file) return res.notFound();
        if (!file.password) return res.notFound();

        const verified = await verifyPassword(req.body.password, file.password);
        if (!verified) return res.forbidden('Incorrect password');

        logger.info(`${file.name} was accessed with the correct password`, { ua: req.headers['user-agent'] });

        return res.send({ success: true });
      },
    });

    done();
  },
  { name: PATH },
);
