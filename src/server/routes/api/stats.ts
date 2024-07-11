import { config } from '@/lib/config';
import { prisma } from '@/lib/db';
import { Metric } from '@/lib/db/models/metric';
import { userMiddleware } from '@/server/middleware/user';
import fastifyPlugin from 'fastify-plugin';

export type ApiStatsResponse = Metric[];

type Query = {
  from?: string;
  to?: string;
  all?: string;
};

export const PATH = '/api/stats';
export default fastifyPlugin(
  (server, _, done) => {
    server.get<{ Querystring: Query }>(PATH, { preHandler: [userMiddleware] }, async (req, res) => {
      if (!config.features.metrics) return res.forbidden('metrics are disabled');

      const { from, to, all } = req.query;

      const fromDate = from ? new Date(from) : new Date(Date.now() - 86400000 * 7); // defaults to a week ago
      const toDate = to ? new Date(to) : new Date();

      if (!all && (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())))
        return res.badRequest('invalid date(s)');

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
    });

    done();
  },
  { name: PATH },
);
