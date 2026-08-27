import { queryUserStats } from '@/lib/stats';
import { userMiddleware } from '@/server/middleware/user';
import typedPlugin from '@/server/typedPlugin';
import z from 'zod';

export type ApiUserStatsResponse = {
  filesUploaded: number;
  favoriteFiles: number;
  views: number;
  avgViews: number;
  storageUsed: number;
  avgStorageUsed: number;
  urlsCreated: number;
  urlViews: number;

  sortTypeCount: { [type: string]: number };
};

export const PATH = '/api/user/stats';

export default typedPlugin(
  async (server) => {
    server.get(
      PATH,
      {
        schema: {
          description: "View aggregate statistics for the authenticated user's files and URLs.",
          response: {
            200: z.object({
              filesUploaded: z.number(),
              favoriteFiles: z.number(),
              views: z.number(),
              avgViews: z.number(),
              storageUsed: z.number(),
              avgStorageUsed: z.number(),
              urlsCreated: z.number(),
              urlViews: z.number(),
              sortTypeCount: z.record(z.string(), z.number()),
            }),
          },
          tags: ['auth'],
        },
        preHandler: [userMiddleware],
      },
      async (req, res) => {
        const stats = await queryUserStats(req.user.id);
        return res.send(stats);
      },
    );
  },
  { name: PATH },
);
