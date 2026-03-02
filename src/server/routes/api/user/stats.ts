import { prisma } from '@/lib/db';
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
        },
        preHandler: [userMiddleware],
      },
      async (req, res) => {
        const aggFile = await prisma.file.aggregate({
          where: {
            userId: req.user.id,
          },
          _count: {
            _all: true,
          },
          _sum: {
            views: true,
            size: true,
          },
          _avg: {
            views: true,
            size: true,
          },
        });

        const favCount = await prisma.file.count({
          where: {
            userId: req.user.id,
            favorite: true,
          },
        });

        const aggUrl = await prisma.url.aggregate({
          where: {
            userId: req.user.id,
          },
          _count: {
            _all: true,
          },
          _avg: {
            views: true,
          },
          _sum: {
            views: true,
          },
        });

        const sortType = await prisma.file.findMany({
          where: {
            userId: req.user.id,
          },
          select: {
            type: true,
          },
        });

        const sortTypeCount = sortType.reduce(
          (acc, cur) => {
            if (acc[cur.type]) acc[cur.type] += 1;
            else acc[cur.type] = 1;

            return acc;
          },
          {} as { [type: string]: number },
        );

        return res.send({
          filesUploaded: aggFile._count._all ?? 0,
          favoriteFiles: favCount ?? 0,
          views: aggFile._sum.views ?? 0,
          avgViews: aggFile._avg.views ?? 0,
          storageUsed: Number(aggFile._sum.size ?? 0),
          avgStorageUsed: Number(aggFile._avg.size ?? 0),
          urlsCreated: aggUrl._count._all ?? 0,
          urlViews: aggUrl._sum.views ?? 0,

          sortTypeCount,
        });
      },
    );
  },
  { name: PATH },
);
