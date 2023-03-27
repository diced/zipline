import { PrismaClient } from '@prisma/client';

if (!global.prisma) {
  if (!process.env.ZIPLINE_DOCKER_BUILD) global.prisma = new PrismaClient();
}

export default global.prisma as PrismaClient;

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient;
}
