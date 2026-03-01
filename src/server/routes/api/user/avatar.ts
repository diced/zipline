import { prisma } from '@/lib/db';
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
          response: {
            200: z.string(),
          },
        },
        preHandler: [userMiddleware],
      },
      async (req, res) => {
        const u = await prisma.user.findFirstOrThrow({
          where: {
            id: req.user.id,
          },
          select: {
            avatar: true,
          },
        });

        if (!u.avatar) return res.notFound();

        return res.send(u.avatar);
      },
    );
  },
  { name: PATH },
);
