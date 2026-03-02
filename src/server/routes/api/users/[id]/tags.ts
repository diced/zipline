import { prisma } from '@/lib/db';
import { Tag, tagSelect } from '@/lib/db/models/tag';
import { canInteract } from '@/lib/role';
import { administratorMiddleware } from '@/server/middleware/administrator';
import { userMiddleware } from '@/server/middleware/user';
import typedPlugin from '@/server/typedPlugin';
import z from 'zod';

export type ApiUsersIdTagsResponse = Tag[];

// const logger = log('api').c('user').c('id').c('tags');

export const PATH = '/api/users/:id/tags';
export default typedPlugin(
  async (server) => {
    server.get(
      PATH,
      {
        schema: {
          description:
            'List tags owned by the specified user, enforcing role-based interaction rules (admin only).',
          params: z.object({
            id: z.string(),
          }),
        },
        preHandler: [userMiddleware, administratorMiddleware],
      },
      async (req, res) => {
        const { id } = req.params;

        const user = await prisma.user.findUnique({
          where: {
            id,
          },
        });

        if (!user) return res.notFound();
        if (!canInteract(req.user.role, user.role)) return res.notFound();

        const tags = await prisma.tag.findMany({
          where: {
            userId: user.id,
          },
          select: tagSelect,
        });

        return res.send(tags);
      },
    );
  },
  { name: PATH },
);
