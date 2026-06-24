import { getExtension } from '@/lib/api/upload';
import { config } from '@/lib/config';
import { prisma } from '@/lib/db';
import { TimedCache } from '@/lib/timedCache';
import type { Prisma } from '@/prisma/client';

const resolveCache = new TimedCache<string, string>(60_000); // 1 min

export function isExtensionlessName(name: string) {
  return getExtension(name) === '';
}

function decodeRouteId(id: string) {
  try {
    return decodeURIComponent(id);
  } catch {
    return id;
  }
}

export async function resolveFileByName<S extends Prisma.FileSelect | undefined>(
  id: string,
  select?: S,
): Promise<Prisma.FileGetPayload<{ select: S }> | null> {
  const decoded = decodeRouteId(id);

  const cachedName = resolveCache.get(decoded);
  if (cachedName) {
    return prisma.file.findFirst({
      where: { name: cachedName },
      ...(select && { select }),
    }) as Promise<Prisma.FileGetPayload<{ select: S }> | null>;
  }

  const exact = await prisma.file.findFirst({
    where: { name: decoded },
    ...(select && { select }),
  });
  if (exact) return exact as Prisma.FileGetPayload<{ select: S }>;

  if (!config.files.omitExtension || !isExtensionlessName(decoded)) return null;

  const fallbackSelect = select ? ({ ...select, name: true } as S & { name: true }) : undefined;
  const matches = await prisma.file.findMany({
    where: { name: { startsWith: `${decoded}.` } },
    take: 2,
    ...(fallbackSelect && { select: fallbackSelect }),
  });

  if (matches.length !== 1) return null;

  resolveCache.set(decoded, matches[0].name);
  return matches[0] as Prisma.FileGetPayload<{ select: S }>;
}

function selfCheck() {
  console.assert(isExtensionlessName('uuid') === true);
  console.assert(isExtensionlessName('file.png') === false);
  console.assert(isExtensionlessName('archive.tar.gz') === false);
}

selfCheck();
