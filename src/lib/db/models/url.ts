import type { Url as PrismaUrl } from '@prisma/client';

export type Url = PrismaUrl & {
  similarity?: number;
};
