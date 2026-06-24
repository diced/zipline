import { getExtension } from '@/lib/api/upload';
import { config } from '@/lib/config';
import { prisma } from '@/lib/db';
import { TimedCache } from '@/lib/timedCache';
import type { Prisma } from '@/prisma/client';

const resolveCache = new TimedCache<string, string>(60_000);

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

type FindArgs = Omit<Prisma.FileFindFirstArgs, 'where'>;

export async function resolveFileByName(id: string, args?: FindArgs) {
  const decoded = decodeRouteId(id);

  const cachedName = resolveCache.get(decoded);
  if (cachedName) {
    return prisma.file.findFirst({ where: { name: cachedName }, ...args });
  }

  const exact = await prisma.file.findFirst({ where: { name: decoded }, ...args });
  if (exact) return exact;

  if (!config.files.omitExtension || !isExtensionlessName(decoded)) return null;

  const fallbackArgs = args?.select ? { ...args, select: { ...args.select, name: true } } : args;
  const matches = await prisma.file.findMany({
    where: { name: { startsWith: `${decoded}.` } },
    take: 2,
    ...fallbackArgs,
  });

  if (matches.length !== 1) return null;

  resolveCache.set(decoded, matches[0].name);
  return matches[0];
}

function selfCheck() {
  console.assert(isExtensionlessName('uuid') === true);
  console.assert(isExtensionlessName('file.png') === false);
  console.assert(isExtensionlessName('archive.tar.gz') === false);
}

selfCheck();
