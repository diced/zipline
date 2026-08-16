import { log } from '@/lib/logger';
import { PrismaPg } from '@prisma/adapter-pg';
import { type Prisma, PrismaClient } from '@/prisma/client';
import { metadataSchema } from './models/incompleteFile';
import { metricDataSchema } from './models/metric';
import { userViewSchema } from './models/user';
import { readDbVars, REQUIRED_DB_VARS } from '../config/read/env';

const building = !!process.env.ZIPLINE_BUILD;

// oxlint-disable-next-line prefer-const
let prisma: ExtendedPrismaClient;

declare global {
  var __db__: ExtendedPrismaClient;
}

if (!global.__db__) {
  if (!building) global.__db__ = getClient();
}

prisma = global.__db__;

type ExtendedPrismaClient = ReturnType<typeof getClient>;

function parseDbLog(env: string): Prisma.LogLevel[] {
  if (env === 'true') return ['query'];

  return env
    .split(',')
    .map((v) => v.trim())
    .filter((v) => v) as unknown as Prisma.LogLevel[];
}

function pgConnectionString() {
  const vars = readDbVars();
  if (vars.DATABASE_URL) return vars.DATABASE_URL;

  return `postgresql://${vars.DATABASE_USERNAME}:${vars.DATABASE_PASSWORD}@${vars.DATABASE_HOST}:${vars.DATABASE_PORT}/${vars.DATABASE_NAME}`;
}

function getClient() {
  const logger = log('db');

  const connectionString = pgConnectionString();
  if (!connectionString) {
    logger.error(`either DATABASE_URL or all of [${REQUIRED_DB_VARS.join(', ')}] not set, exiting...`);
    process.exit(1);
  }

  process.env.DATABASE_URL = connectionString;

  logger.info('connecting to database');
  logger.debug('connecting to database', { url: connectionString });

  const adapter = new PrismaPg({ connectionString });
  const client = new PrismaClient({
    adapter,
    log: process.env.ZIPLINE_DB_LOG ? parseDbLog(process.env.ZIPLINE_DB_LOG) : undefined,
  }).$extends({
    result: {
      file: {
        size: {
          needs: { size: true },
          compute({ size }: { size: bigint }) {
            return Number(size);
          },
        },
      },
      user: {
        view: {
          needs: { view: true },
          compute({ view }: { view: Prisma.JsonValue }) {
            return userViewSchema.parse(view);
          },
        },
        totpEnabled: {
          needs: { totpSecret: true },
          compute({ totpSecret }: { totpSecret: string | null }) {
            return !!totpSecret;
          },
        },
      },
      metric: {
        data: {
          needs: { data: true },
          compute({ data }: { data: Prisma.JsonValue }) {
            return metricDataSchema.parse(data);
          },
        },
      },
      incompleteFile: {
        metadata: {
          needs: { metadata: true },
          compute({ metadata }: { metadata: Prisma.JsonValue }) {
            return metadataSchema.parse(metadata);
          },
        },
      },
    },
  });
  client.$connect();

  return client;
}

export { prisma };
