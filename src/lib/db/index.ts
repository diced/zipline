import { PrismaClient } from '@prisma/client';
import { log } from '@/lib/logger';

let prisma: PrismaClient;

declare global {
  var __db__: PrismaClient;
}

if (process.env.NODE_ENV === 'production') {
  prisma = getClient();
} else {
  if (!global.__db__) {
    global.__db__ = getClient();
  }
  prisma = global.__db__;
}

function getClient() {
  const logger = log('db');

  logger.info('connecting to database', process.env.DATABASE_URL);

  const client = new PrismaClient();
  client.$connect();

  return client;
}

export { prisma };
