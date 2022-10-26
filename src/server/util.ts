import { Migrate } from '@prisma/migrate/dist/Migrate';
import { ensureDatabaseExists } from '@prisma/migrate/dist/utils/ensureDatabaseExists';
import Logger from '../lib/logger';
import { bytesToHuman } from '../lib/utils/bytes';
import { Datasource } from '../lib/datasources';
import { PrismaClient } from '@prisma/client';

export async function migrations() {
  try {
    const migrate = new Migrate('./prisma/schema.prisma');
    await ensureDatabaseExists('apply', true, './prisma/schema.prisma');

    const diagnose = await migrate.diagnoseMigrationHistory({
      optInToShadowDatabase: false,
    });

    if (diagnose.history?.diagnostic === 'databaseIsBehind') {
      try {
        Logger.get('database').info('migrating database');
        await migrate.applyMigrations();
      } finally {
        migrate.stop();
        Logger.get('database').info('finished migrating database');
      }
    } else {
      migrate.stop();
    }
  } catch (error) {
    Logger.get('database').error('Failed to migrate database... exiting...');
    Logger.get('database').error(error);
    process.exit(1);
  }
}

export function log(url: string) {
  if (url.startsWith('/_next') || url.startsWith('/__nextjs')) return;
  return Logger.get('url').info(url);
}

export async function getStats(prisma: PrismaClient, datasource: Datasource) {
  const size = await datasource.fullSize();
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
  for (let i = 0, L = typesCount.length; i !== L; ++i)
    types_count.push({
      mimetype: typesCount[i].mimetype,
      count: typesCount[i]._count.mimetype,
    });

  return {
    size: bytesToHuman(size),
    size_num: size,
    count,
    count_by_user: count_by_user.sort((a, b) => b.count - a.count),
    count_users,
    views_count: viewsCount[0]?._sum?.views ?? 0,
    types_count: types_count.sort((a, b) => b.count - a.count),
  };
}
