import { NextApiReq, NextApiRes, withZipline } from 'middleware/withZipline';
import prisma from 'lib/prisma';
import config from 'lib/config';
import { Stats } from '@prisma/client';

async function handler(req: NextApiReq, res: NextApiRes) {
  const user = await req.user();
  if (!user) return res.forbid('not logged in');

  let amount = typeof req.query.amount === 'string' ? parseInt(req.query.amount) : 2;
  if(isNaN(amount)) return res.bad('invalid amount');

  // get stats per day

  var stats = await prisma.$queryRaw<Stats[]>`
    SELECT *
    FROM "Stats" as t JOIN
          (SELECT MAX(t2."created_at") as max_timestamp
            FROM "Stats" t2
            GROUP BY date(t2."created_at")
          ) t2
          ON t."created_at" = t2.max_timestamp
    ORDER BY t."created_at" DESC
    LIMIT ${amount}
  `;

  if (config.website.show_files_per_user) {
    stats = stats.map((stat) => {
      (stat.data as any).count_by_user = [];
      return stat;
    });
  }

  return res.json(stats);
}

export default withZipline(handler);