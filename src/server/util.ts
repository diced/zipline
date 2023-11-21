import { PrismaClient } from '@prisma/client';
import { Migrate } from '@prisma/migrate/dist/Migrate';
import { ensureDatabaseExists } from '@prisma/migrate/dist/utils/ensureDatabaseExists';
import { ServerResponse } from 'http';
import { Datasource } from 'lib/datasources';
import Logger from 'lib/logger';
import { bytesToHuman } from 'lib/utils/bytes';

export async function migrations() {
  const logger = Logger.get('database::migrations');

  try {
    logger.info('establishing database connection');
    const migrate = new Migrate('./prisma/schema.prisma');

    logger.info('ensuring database exists, if not creating database - may error if no permissions');
    await ensureDatabaseExists('apply', './prisma/schema.prisma');

    const diagnose = await migrate.diagnoseMigrationHistory({
      optInToShadowDatabase: false,
    });

    if (diagnose.history?.diagnostic === 'databaseIsBehind') {
      if (!diagnose.hasMigrationsTable) {
        logger.debug('no migrations table found, attempting schema push');
        try {
          logger.debug('pushing schema');
          const migration = await migrate.push({ force: false });
          if (migration.unexecutable && migration.unexecutable.length > 0)
            throw new Error('This database is not empty, schema push is not possible.');
        } catch (e) {
          migrate.stop();
          logger.error('failed to push schema');
          throw e;
        }
        logger.debug('finished pushing schema, marking migrations as applied');
        for (const migration of diagnose.history.unappliedMigrationNames) {
          await migrate.markMigrationApplied({ migrationId: migration });
        }
        migrate.stop();
        logger.info('finished migrating database');
      } else if (diagnose.hasMigrationsTable) {
        logger.debug('database is behind, attempting to migrate');
        try {
          logger.debug('migrating database');
          await migrate.applyMigrations();
        } catch (e) {
          logger.error('failed to migrate database');
          migrate.stop();
          throw e;
        }
        migrate.stop();
        logger.info('finished migrating database');
      }
    } else {
      logger.info('exiting migrations engine - database is up to date');
      migrate.stop();
    }
  } catch (error) {
    if (error.message.startsWith('P1001')) {
      logger.error(
        `Unable to connect to database \`${process.env.DATABASE_URL}\`, check your database connection`,
      );
      logger.debug(error);
    } else {
      logger.error('Failed to migrate database... exiting...');
      logger.error(error);
    }

    process.exit(1);
  }
}

export function log(url: string) {
  if (url.startsWith('/_next') || url.startsWith('/__nextjs')) return;
  return Logger.get('url').info(url);
}

export function redirect(res: ServerResponse, url: string) {
  res.writeHead(307, { Location: url });
  res.end();
}

export async function getStats(prisma: PrismaClient, datasource: Datasource, logger: Logger) {
  const size = await datasource.fullSize();
  logger.debug(`full size: ${size}`);

  const byUser = await prisma.file.groupBy({
    by: ['userId'],
    _count: {
      _all: true,
    },
  });
  logger.debug(`by user: ${JSON.stringify(byUser)}`);

  const count_users = await prisma.user.count();
  logger.debug(`count users: ${count_users}`);

  const count_by_user = [];
  for (let i = 0, L = byUser.length; i !== L; ++i) {
    if (!byUser[i].userId) {
      logger.debug(`skipping user ${byUser[i]}`);
      continue;
    }

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
  logger.debug(`count by user: ${JSON.stringify(count_by_user)}`);

  const count = await prisma.file.count();
  logger.debug(`count files: ${JSON.stringify(count)}`);

  const views = await prisma.file.aggregate({
    _sum: {
      views: true,
    },
  });
  logger.debug(`sum views: ${JSON.stringify(views)}`);

  const typesCount = await prisma.file.groupBy({
    by: ['mimetype'],
    _count: {
      mimetype: true,
    },
  });
  logger.debug(`types count: ${JSON.stringify(typesCount)}`);
  const types_count = [];
  for (let i = 0, L = typesCount.length; i !== L; ++i)
    types_count.push({
      mimetype: typesCount[i].mimetype,
      count: typesCount[i]._count.mimetype,
    });

  logger.debug(`types count: ${JSON.stringify(types_count)}`);

  return {
    size: bytesToHuman(size),
    size_num: size,
    count,
    count_by_user: count_by_user.sort((a, b) => b.count - a.count),
    count_users,
    views_count: views?._sum?.views ?? 0,
    types_count: types_count.sort((a, b) => b.count - a.count),
  };
}
