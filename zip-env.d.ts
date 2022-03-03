import type { PrismaClient } from '@prisma/client';
import type { Datasource } from 'lib/datasource';
import type { Config } from '.lib/types';

declare global {
  namespace NodeJS {
    interface Global {
      prisma: PrismaClient;
      config: Config;
      datasource: Datasource
    }

    interface ProcessEnv {
      ZIPLINE_DOCKER_BUILD: string | '1';
    }
  }
}