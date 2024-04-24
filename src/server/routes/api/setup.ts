import { createToken, hashPassword } from '@/lib/crypto';
import { prisma } from '@/lib/db';
import { User, userSelect } from '@/lib/db/models/user';
import { getZipline } from '@/lib/db/models/zipline';
import { log } from '@/lib/logger';
import fastifyPlugin from 'fastify-plugin';

export type ApiSetupResponse = {
  firstSetup?: boolean;
  user?: User;
};

type Body = {
  username: string;
  password: string;
};

const logger = log('api').c('setup');

export const PATH = '/api/setup';
export default fastifyPlugin(
  (server, _, done) => {
    server.get(PATH, async (_, res) => {
      const { firstSetup } = await getZipline();
      if (!firstSetup) return res.forbidden();

      return res.send({ firstSetup });
    });

    server.post<{ Body: Body }>(PATH, async (req, res) => {
      const { firstSetup, id } = await getZipline();

      if (!firstSetup) return res.forbidden();

      logger.info('first setup running');

      const { username, password } = req.body;
      if (!username) return res.badRequest('Username is required');
      if (!password) return res.badRequest('Password is required');

      const user = await prisma.user.create({
        data: {
          username,
          password: await hashPassword(password),
          role: 'SUPERADMIN',
          token: createToken(),
        },
        select: userSelect,
      });

      logger.info('first setup complete');

      await prisma.zipline.update({
        where: {
          id,
        },
        data: {
          firstSetup: false,
        },
      });

      return res.send({
        firstSetup,
        user,
      });
    });

    done();
  },
  { name: PATH },
);
