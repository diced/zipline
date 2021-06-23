/// <reference types="next" />
/// <reference types="next/types/global" />

import type { PrismaClient } from '@prisma/client';
import type { Config } from './src/lib/types';

declare global {
  namespace NodeJS {
    interface Global {
      prisma: PrismaClient;
      config: Config
    }
  }
}