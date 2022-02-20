import type { PrismaClient } from '@prisma/client';
import type { Config } from './src/lib/types';

declare global {
  namespace NodeJS {
    interface Global {
      prisma: PrismaClient;
      config: Config;
    }

    interface ProcessEnv {
      ZIPLINE_DOCKER_BUILD: string | '1';
    }
  }
}