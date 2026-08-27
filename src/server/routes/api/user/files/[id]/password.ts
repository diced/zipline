import { ApiError } from '@/lib/api/errors';
import { createAccessToken } from '@/lib/accessToken';
import { verifyPassword } from '@/lib/crypto';
import { db } from '@/lib/db';
import { log } from '@/lib/logger';
import { secondlyRatelimit } from '@/lib/ratelimits';
import { zStringTrimmed } from '@/lib/validation';
import typedPlugin from '@/server/typedPlugin';
import z from 'zod';
import { files } from '@/lib/db/schema';
import { eq, or } from 'drizzle-orm';

export type ApiUserFilesIdPasswordResponse = {
  success: boolean;
  token: string;
};

const logger = log('api').c('user').c('files').c('[id]').c('password');

export const PATH = '/api/user/files/:id/password';
export default typedPlugin(
  async (server) => {
    server.post(
      PATH,
      {
        schema: {
          description:
            'Verify the password for a password-protected file by ID or name and receive an access token if the password is correct',
          body: z.object({
            password: zStringTrimmed,
          }),
          params: z.object({
            id: z.string(),
          }),
          response: {
            200: z.object({
              success: z.boolean(),
              token: z.string(),
            }),
          },
        },
        ...secondlyRatelimit(2),
      },
      async (req, res) => {
        const [file] = await db
          .select({ id: files.id, name: files.name, password: files.password })
          .from(files)
          .where(or(eq(files.id, req.params.id), eq(files.name, req.params.id)));

        if (!file) throw new ApiError(4000);
        if (!file.password) throw new ApiError(4000);

        const verified = await verifyPassword(req.body.password, file.password);
        if (!verified) {
          logger.warn('invalid password for file', {
            file: file.name,
            ip: req.ip ?? 'unknown',
            ua: req.headers['user-agent'],
          });

          throw new ApiError(3005);
        }
        logger.info(`${file.name} was accessed with the correct password, a new access token was created`, {
          ua: req.headers['user-agent'],
        });

        const token = createAccessToken({ type: 'file', id: file.id });
        return res.send({ success: true, token });
      },
    );
  },
  { name: PATH },
);
