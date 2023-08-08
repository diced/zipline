import { log } from '@/lib/logger';
import { Prisma, PrismaClient } from '@prisma/client';
import { userViewSchema } from './models/user';

let prisma: ExtendedPrismaClient;

declare global {
  var __db__: ExtendedPrismaClient;
}

if (process.env.NODE_ENV === 'production') {
  prisma = getClient();
} else {
  if (!global.__db__) {
    global.__db__ = getClient();
  }
  prisma = global.__db__;
}

type ExtendedPrismaClient = ReturnType<typeof getClient>;

function getClient() {
  const logger = log('db');

  logger.info('connecting to database ' + process.env.DATABASE_URL);

  const client = new PrismaClient({
    // log: ['query'],
  }).$extends({
    result: {
      user: {
        view: {
          needs: { view: true },
          compute({ view }: { view: Prisma.JsonValue }) {
            return userViewSchema.parse(view);
          },
        },
      },
    },
  });
  client.$connect();

  return client;
}

export { prisma };
