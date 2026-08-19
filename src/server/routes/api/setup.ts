import { ApiError } from '@/lib/api/errors';
import { createToken, hashPassword } from '@/lib/crypto';
import { db } from '@/lib/db';
import { createFullUser, type User, userSchema } from '@/lib/db/models/user';
import { claimFirstSetup, getZipline } from '@/lib/db/models/zipline';
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
        await getZipline();

        const { username, password } = req.body;

        const hashed = await hashPassword(password);
        const token = createToken();

        logger.info('first setup running');

        const user = await db.transaction(async (tx) => {
          if (!(await claimFirstSetup(tx))) throw new ApiError(9001);

          return createFullUser(
            {
              username,
              password: hashed,
              role: 'SUPERADMIN',
              token,
            },
            tx,
          );
        });

        logger.info('first setup complete');

        return res.send({
          firstSetup: false,
          user,
        });
      },
    );
  },
  { name: PATH },
);
