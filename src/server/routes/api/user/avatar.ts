import { ApiError } from '@/lib/api/errors';
import { findUserRowById } from '@/lib/db/models/user';
import { userMiddleware } from '@/server/middleware/user';
import typedPlugin from '@/server/typedPlugin';
import z from 'zod';

export type ApiUserAvatarResponse = string;

export const PATH = '/api/user/avatar';
export default typedPlugin(
  async (server) => {
    server.get(
      PATH,
      {
        schema: {
          description: "Return the current user's avatar as a base64 data URL.",
          response: {
            200: z.string().describe('data URL with base64'),
          },
          tags: ['auth'],
        },
        preHandler: [userMiddleware],
      },
      async (req, res) => {
        const u = await findUserRowById(req.user.id);

        if (!u?.avatar) throw new ApiError(9002);

        return res.send(u.avatar);
      },
    );
  },
  { name: PATH },
);
