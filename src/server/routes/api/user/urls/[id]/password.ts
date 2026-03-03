import { ApiError } from '@/lib/api/errors';
import { verifyPassword } from '@/lib/crypto';
import { prisma } from '@/lib/db';
import { log } from '@/lib/logger';
import { secondlyRatelimit } from '@/lib/ratelimits';
import { zStringTrimmed } from '@/lib/validation';
import typedPlugin from '@/server/typedPlugin';
import z from 'zod';

export type ApiUserUrlsIdPasswordResponse = {
  success: boolean;
};

const logger = log('api').c('user').c('urls').c('[id]').c('password');

export const PATH = '/api/user/urls/:id/password';
export default typedPlugin(
  async (server) => {
    server.post(
      PATH,
      {
        schema: {
          description: 'Verify the password for a password-protected short URL by ID, code, or vanity.',
          params: z.object({
            id: z.string(),
          }),
          body: z.object({
            password: zStringTrimmed,
          }),
        },
        ...secondlyRatelimit(2),
      },
      async (req, res) => {
        const url = await prisma.url.findFirst({
          where: {
            OR: [{ id: req.params.id }, { code: req.params.id }, { vanity: req.params.id }],
          },
          select: {
            password: true,
            id: true,
          },
        });
        if (!url) throw new ApiError(9002);
        if (!url.password) throw new ApiError(9002);

        const verified = await verifyPassword(req.body.password, url.password);
        if (!verified) {
          logger.warn('invalid password for URL', {
            url: url.id,
            ip: req.ip ?? 'unknown',
            ua: req.headers['user-agent'],
          });

          throw new ApiError(9002);
        }

        logger.info(`url ${url.id} was accessed with the correct password`, {
          ua: req.headers['user-agent'],
        });

        res.cookie('url_pw_' + url.id, req.body.password, {
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
