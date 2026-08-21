import { ApiError } from '@/lib/api/errors';
import { db } from '@/lib/db';
import { tagColumns, Tag } from '@/lib/db/models/tag';
import { getUserIdentity } from '@/lib/db/models/user';
import { canInteract } from '@/lib/role';
import { administratorMiddleware } from '@/server/middleware/administrator';
import { userMiddleware } from '@/server/middleware/user';
import typedPlugin from '@/server/typedPlugin';
import z from 'zod';

export type ApiUsersIdTagsResponse = Tag[];

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
          tags: ['auth', 'admin'],
        },
        preHandler: [userMiddleware, administratorMiddleware],
      },
      async (req, res) => {
        const { id } = req.params;

        const user = await getUserIdentity(id);

        if (!user) throw new ApiError(9002);
        if (!canInteract(req.user.role, user.role)) throw new ApiError(9002);

        const tags = await db.query.tags.findMany({
          columns: tagColumns,
          where: { userId: user.id },
          with: { files: { columns: { id: true } } },
        });

        return res.send(tags);
      },
    );
  },
  { name: PATH },
);
