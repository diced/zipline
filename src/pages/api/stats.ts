import { Stats } from '@prisma/client';
import config from 'lib/config';
import datasource from 'lib/datasource';
import Logger from 'lib/logger';
import prisma from 'lib/prisma';
import { NextApiReq, NextApiRes, UserExtended, withZipline } from 'middleware/withZipline';
import { getStats } from 'server/util';

async function handler(req: NextApiReq, res: NextApiRes, user: UserExtended) {
  if (req.method === 'POST') {
    if (!user.administrator) return res.forbidden('not an administrator');

    const stats = await getStats(prisma, datasource, Logger.get('server'));
    const stats_data = await prisma.stats.create({
      data: {
        data: stats,
      },
    });

    return res.json(stats_data);
  } else {
    let amount = typeof req.query.amount === 'string' ? Number(req.query.amount) : 2;
    if (isNaN(amount)) return res.badRequest('invalid amount');

    // get stats per day

    let stats: Stats[] = await prisma.$queryRaw`
      SELECT *
      FROM "Stats" as t JOIN
            (SELECT MAX(t2."createdAt") as max_timestamp
              FROM "Stats" t2
              GROUP BY date(t2."createdAt")
            ) t2
            ON t."createdAt" = t2.max_timestamp
      ORDER BY t."createdAt" DESC
      LIMIT ${amount}
    `;

    if (!config.website.show_files_per_user) {
      stats = stats.map((stat) => {
        (stat.data as any).count_by_user = [];
        return stat;
      });
    }

    return res.json(stats);
  }
}

export default withZipline(handler, {
  methods: ['GET', 'POST'],
  user: true,
});
