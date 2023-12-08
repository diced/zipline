import { config } from '@/lib/config';
import { prisma } from '@/lib/db';
import { Metric } from '@/lib/db/models/metric';
import { combine } from '@/lib/middleware/combine';
import { method } from '@/lib/middleware/method';
import { NextApiReq, NextApiRes } from '@/lib/response';

export type ApiStatsResponse = Metric[];

type Query = {
  from?: string;
  to?: string;
};

export async function handler(req: NextApiReq<any, Query>, res: NextApiRes<ApiStatsResponse>) {
  if (!config.features.metrics) return res.forbidden();

  const { from, to } = req.query;

  const fromDate = from ? new Date(from) : new Date(Date.now() - 86400000);
  const toDate = to ? new Date(to) : new Date();

  if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) return res.badRequest('invalid date');

  const stats = await prisma.metric.findMany({
    where: {
      createdAt: {
        gte: fromDate,
        lte: toDate,
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  if (!config.website.metricsShowUserSpecific) {
    for (let i = 0; i !== stats.length; ++i) {
      const stat = stats[i].data;

      stat.filesUsers = [];
      stat.urlsUsers = [];
    }
  }

  return res.ok(stats);
}

export default combine([method(['GET'])], handler);
