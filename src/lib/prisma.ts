import { PrismaClient } from '@prisma/client';
import 'lib/config';

if (!global.prisma) {
  if (!process.env.ZIPLINE_DOCKER_BUILD) {
    process.env.DATABASE_URL = config.core.database_url;
    global.prisma = new PrismaClient();
  }
}

export default global.prisma as PrismaClient;

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient;
}
