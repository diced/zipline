import { ApiError } from '@/lib/api/errors';
import { config } from '@/lib/config';
import { prisma } from '@/lib/db';
import { Metric, metricSchema } from '@/lib/db/models/metric';
import { isAdministrator } from '@/lib/role';
import { zQsBoolean } from '@/lib/validation';
import { userMiddleware } from '@/server/middleware/user';
import typedPlugin from '@/server/typedPlugin';
import z from 'zod';

export type ApiStatsResponse = Metric[];

export const PATH = '/api/stats';
export default typedPlugin(
  async (server) => {
    server.get(
      PATH,
      {
        schema: {
          description:
            'Get instance-wide metrics and statistics for Zipline over a given date range or for all time.',
          querystring: z.object({
            from: z
              .string()
              .optional()
              .refine((val) => {
                if (!val) return true;
                const date = new Date(val);
                return !isNaN(date.getTime());
              }, 'Invalid date'),
            to: z
              .string()
              .optional()
              .refine((val) => {
                if (!val) return true;
                const date = new Date(val);
                return !isNaN(date.getTime());
              }, 'Invalid date'),
            all: zQsBoolean.default(false),
          }),
          response: {
            200: z.array(metricSchema),
          },
        },
        preHandler: [userMiddleware],
      },
      async (req, res) => {
        if (!config.features.metrics) throw new ApiError(3001);

        if (config.features.metrics.adminOnly && !isAdministrator(req.user.role)) throw new ApiError(3000);

        const { from, to, all } = req.query;

        const fromDate = from ? new Date(from) : new Date(Date.now() - 86400000 * 7); // defaults to a week ago
        const toDate = to ? new Date(to) : new Date();

        if (!all) {
          if (fromDate > toDate) throw new ApiError(1058);
          if (fromDate > new Date()) throw new ApiError(1059);
        }

        const stats = await prisma.metric.findMany({
          where: {
            ...(!all && {
              createdAt: {
                gte: fromDate,
                lte: toDate,
              },
            }),
          },
          orderBy: {
            createdAt: 'desc',
          },
        });

        if (!config.features.metrics.showUserSpecific) {
          for (let i = 0; i !== stats.length; ++i) {
            const stat = stats[i].data;

            stat.filesUsers = [];
            stat.urlsUsers = [];
          }
        }

        return res.send(stats);
      },
    );
  },
  { name: PATH },
);
