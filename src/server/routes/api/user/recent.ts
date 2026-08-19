import { files as fileTable } from '@/lib/db/schema';
import { File, cleanFiles, fileSchema, listFiles } from '@/lib/db/models/file';
import { userMiddleware } from '@/server/middleware/user';
import typedPlugin from '@/server/typedPlugin';
import z from 'zod';
import { desc, eq } from 'drizzle-orm';

export type ApiUserRecentResponse = File[];

export const PATH = '/api/user/recent';
export default typedPlugin(
  async (server) => {
    server.get(
      PATH,
      {
        schema: {
          description: 'Get the most recently uploaded files for the authenticated user.',
          querystring: z.object({
            take: z.coerce.number().min(1).max(100).default(3),
          }),
          response: {
            200: z.array(fileSchema),
          },
          tags: ['auth'],
        },
        preHandler: [userMiddleware],
      },
      async (req, res) => {
        const { take } = req.query;

        const files = cleanFiles(
          await listFiles({
            where: eq(fileTable.userId, req.user.id),
            orderBy: desc(fileTable.createdAt),
            limit: take,
          }),
        );

        return res.send(files);
      },
    );
  },
  { name: PATH },
);
