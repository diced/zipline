import { ApiError } from '@/lib/api/errors';
import { verifyPassword } from '@/lib/crypto';
import { prisma } from '@/lib/db';
import { log } from '@/lib/logger';
import { secondlyRatelimit } from '@/lib/ratelimits';
import { zStringTrimmed } from '@/lib/validation';
import typedPlugin from '@/server/typedPlugin';
import z from 'zod';

export type ApiUserFilesIdPasswordResponse = {
  success: boolean;
};

const logger = log('api').c('user').c('files').c('[id]').c('password');

export const PATH = '/api/user/files/:id/password';
export default typedPlugin(
  async (server) => {
    server.post(
      PATH,
      {
        schema: {
          description: 'Verify the password for a password-protected file by ID or name.',
          body: z.object({
            password: zStringTrimmed,
          }),
          params: z.object({
            id: z.string(),
          }),
          response: {
            200: z.object({
              success: z.boolean(),
            }),
          },
        },
        ...secondlyRatelimit(2),
      },
      async (req, res) => {
        const file = await prisma.file.findFirst({
          where: {
            OR: [{ id: req.params.id }, { name: req.params.id }],
          },
          select: {
            name: true,
            password: true,
            id: true,
          },
        });
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
        logger.info(`${file.name} was accessed with the correct password`, { ua: req.headers['user-agent'] });

        res.cookie('file_pw_' + file.id, req.body.password, {
          sameSite: 'lax',
          maxAge: 60,
          httpOnly: false,
          secure: false,
          path: '/',
        });

        return res.send({ success: true });
      },
    );
  },
  { name: PATH },
);
