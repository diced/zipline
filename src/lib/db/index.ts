import { log } from '@/lib/logger';
import { Prisma, PrismaClient } from '@prisma/client';
import { userViewSchema } from './models/user';
import { metricDataSchema } from './models/metric';
import { metadataSchema } from './models/incompleteFile';

const building = !!process.env.ZIPLINE_BUILD;

let prisma: ExtendedPrismaClient;

declare global {
  // eslint-disable-next-line no-var
  var __db__: ExtendedPrismaClient;
}

if (!global.__db__) {
  if (!building) global.__db__ = getClient();
}

// eslint-disable-next-line prefer-const
prisma = global.__db__;

type ExtendedPrismaClient = ReturnType<typeof getClient>;

function parseDbLog(env: string): Prisma.LogLevel[] {
  if (env === 'true') return ['query'];

  return env
    .split(',')
    .map((v) => v.trim())
    .filter((v) => v) as unknown as Prisma.LogLevel[];
}

function getClient() {
  const logger = log('db');

  logger.info('connecting to database ' + process.env.DATABASE_URL);

  const client = new PrismaClient({
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
