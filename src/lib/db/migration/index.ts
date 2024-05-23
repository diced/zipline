import { Migrate } from '@prisma/migrate/dist/Migrate';
import { ensureDatabaseExists } from '@prisma/migrate/dist/utils/ensureDatabaseExists';
import { log } from '@/lib/logger';

export async function runMigrations() {
  const migrate = new Migrate('./prisma/schema.prisma');
  const logger = log('migrations');
  logger.debug('running migrations...');

  try {
    logger.debug('ensuring database exists...');
    const dbCreated = await ensureDatabaseExists('apply', './prisma/schema.prisma');
    if (dbCreated) {
      logger.info('database created');
    }
  } catch (e) {
    logger.error('failed to create database' + e);
    logger.error('try creating the database manually and running the server again');

    migrate.stop();
    process.exit(1);
  }

  let migrationIds: string[];
  try {
    logger.debug('applying migrations...');
    const { appliedMigrationNames } = await migrate.applyMigrations();
    migrationIds = appliedMigrationNames;
  } catch (e) {
    logger.error('failed to apply migrations' + e);

    migrate.stop();
    process.exit(1);
  } finally {
    migrate.stop();
  }

  if (migrationIds?.length === 0) {
    logger.debug('no migrations applied');
    return;
  }

  logger.info(`applied migrations: ${migrationIds.join(', ')}`);
}
