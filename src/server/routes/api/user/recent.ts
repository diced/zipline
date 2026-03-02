import { prisma } from '@/lib/db';
import { File, cleanFiles, fileSchema, fileSelect } from '@/lib/db/models/file';
import { userMiddleware } from '@/server/middleware/user';
import typedPlugin from '@/server/typedPlugin';
import z from 'zod';

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
        },
        preHandler: [userMiddleware],
      },
      async (req, res) => {
        const { take } = req.query;

        const files = cleanFiles(
          await prisma.file.findMany({
            where: {
              userId: req.user.id,
            },
            select: {
              ...fileSelect,
              password: true,
            },
            orderBy: {
              createdAt: 'desc',
            },
            take,
          }),
        );

        return res.send(files);
      },
    );
  },
  { name: PATH },
);
