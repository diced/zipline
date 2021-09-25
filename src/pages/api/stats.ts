import { join } from 'path';
import { NextApiReq, NextApiRes, withZipline } from 'middleware/withZipline';
import prisma from 'lib/prisma';
import { bytesToRead, sizeOfDir } from 'lib/util';
import config from 'lib/config';

async function handler(req: NextApiReq, res: NextApiRes) {
  const user = await req.user();
  if (!user) return res.forbid('not logged in');

  const size = await sizeOfDir(join(process.cwd(), config.uploader.directory));
  const byUser = await prisma.image.groupBy({
    by: ['userId'],
    _count: {
      _all: true,
    },
  });
  const count_users = await prisma.user.count();

  const count_by_user = [];
  for (let i = 0, L = byUser.length; i !== L; ++i) {
    const user = await prisma.user.findFirst({
      where: {
        id: byUser[i].userId,
      },
    });

    count_by_user.push({
      username: user.username,
      count: byUser[i]._count._all,
    });
  }

  const count = await prisma.image.count();
  const viewsCount = await prisma.image.groupBy({
    by: ['views'],
    _sum: {
      views: true,
    },
  });

  const typesCount = await prisma.image.groupBy({
    by: ['mimetype'],
    _count: {
      mimetype: true,
    },
  });
  const types_count = [];
  for (let i = 0, L = typesCount.length; i !== L; ++i) types_count.push({ mimetype: typesCount[i].mimetype, count: typesCount[i]._count.mimetype });

  return res.json({
    size: bytesToRead(size),
    size_num: size,
    count,
    count_by_user: count_by_user.sort((a,b) => b.count-a.count),
    count_users,
    views_count: (viewsCount[0]?._sum?.views ?? 0),
    types_count: types_count.sort((a,b) => b.count-a.count),
  });
}

export default withZipline(handler);