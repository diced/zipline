import { ApiError } from '@/lib/api/errors';
import { createToken, hashPassword } from '@/lib/crypto';
import { prisma } from '@/lib/db';
import { User, userSchema, userSelect } from '@/lib/db/models/user';
import { getZipline } from '@/lib/db/models/zipline';
import { log } from '@/lib/logger';
import { secondlyRatelimit } from '@/lib/ratelimits';
import { zStringTrimmed } from '@/lib/validation';
import typedPlugin from '@/server/typedPlugin';
import z from 'zod';

export type ApiSetupResponse = {
  firstSetup?: boolean;
  user?: User;
};

const logger = log('api').c('setup');

export const PATH = '/api/setup';
export default typedPlugin(
  async (server) => {
    server.get(
      PATH,
      {
        schema: {
          description: 'Return whether Zipline is in first-time setup mode, used by the initial setup flow.',
          response: {
            200: z.object({
              firstSetup: z.boolean(),
            }),
          },
        },
      },
      async (_, res) => {
        const { firstSetup } = await getZipline();
        if (!firstSetup) throw new ApiError(9001);

        return res.send({ firstSetup });
      },
    );

    server.post(
      PATH,
      {
        schema: {
          description: 'Perform the first-time setup by creating the initial SUPERADMIN user.',
          body: z.object({
            username: zStringTrimmed,
            password: zStringTrimmed,
          }),
          response: {
            200: z.object({
              firstSetup: z.boolean(),
              user: userSchema,
            }),
          },
        },
        ...secondlyRatelimit(5),
      },
      async (req, res) => {
        const { firstSetup, id } = await getZipline();

        if (!firstSetup) throw new ApiError(9001);

        logger.info('first setup running');

        const { username, password } = req.body;

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
      },
    );
  },
  { name: PATH },
);
