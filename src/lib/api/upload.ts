import { extname } from 'path';
import { User } from '@/lib/db/models/user';
import { prisma } from '@/lib/db';
import { bytes } from '@/lib/bytes';
import { config } from '../config';
import { Config } from '../config/validate';
import { sanitizeFilename } from '../fs';
import { formatFileName } from '../uploader/formatFileName';
import { guess } from '../mimes';
import { log } from '../logger';

const logger = log('upload');

const commonDoubleExts = [
  '.tar.gz',
  '.tar.xz',
  '.tar.bz2',
  '.tar.lz',
  '.tar.lzma',
  '.tar.Z',
  '.tar.7z',
  '.zip.gz',
  '.zip.xz',
  '.rar.gz',
  '.log.gz',
  '.csv.gz',
  '.pdf.gz',
  // feel free to PR more
];

export function getExtension(filename: string, override?: string) {
  return override ?? commonDoubleExts.find((ext) => filename.endsWith(ext)) ?? extname(filename);
}

export async function checkQuota(
  user: Pick<User, 'id' | 'quota'> | null,
  newSize: number,
  fileCount: number,
  db: Pick<typeof prisma, 'file'> = prisma,
): Promise<true | string> {
  if (!user?.quota) return true;

  if (user.quota.filesQuota === 'BY_BYTES') {
    const stats = await db.file.aggregate({
      where: { userId: user.id },
      _sum: { size: true },
    });

    if (Number(stats._sum.size ?? 0n) + newSize > bytes(user.quota.maxBytes!))
      return `uploading will exceed your storage quota of ${user.quota.maxBytes}`;

    return true;
  }

  const count = await db.file.count({ where: { userId: user.id } });
  if (count + fileCount > user.quota.maxFiles!)
    return `uploading will exceed your file count quota of ${user.quota.maxFiles} files`;

  return true;
}

export function getDomain(
  overrideDomain?: string | null,
  defaultDomain?: string | null,
  hostDomain?: string,
) {
  const base = `${config.core.returnHttpsUrls ? 'https' : 'http'}://`;

  if (overrideDomain) return base + overrideDomain;
  if (defaultDomain) return base + defaultDomain;

  // using localhost as a fallback in the 1% chance theres no host header
  return base + (hostDomain ?? 'localhost');
}

export async function getFilename(
  format: Config['files']['defaultFormat'],
  originalName: string,
  extension: string,
  override?: string,
  reservedNames?: Set<string>,
): Promise<{ error: string } | { fileName: string }> {
  try {
    let fileName = override ? sanitizeFilename(override) : formatFileName(format, originalName);

    if (!fileName) return { error: 'invalid file name' };

    let fullFileName = `${fileName}${extension}`;
    let existing =
      reservedNames?.has(fullFileName) || (await prisma.file.findFirst({ where: { name: fullFileName } }));

    if (existing && (override || format === 'name')) {
      return { error: 'file with the same name already exists' };
    }

    let dateIncrement = 1;

    while (existing && (format === 'random' || format === 'date')) {
      fileName = formatFileName(format, originalName, dateIncrement++);
      if (!fileName) return { error: 'invalid file name' };

      fullFileName = `${fileName}${extension}`;
      existing =
        reservedNames?.has(fullFileName) || (await prisma.file.findFirst({ where: { name: fullFileName } }));
    }

    reservedNames?.add(fullFileName);
    return { fileName };
  } catch (e) {
    logger.warn(`error generating file name: ${e}`);

    return {
      error: e instanceof URIError ? 'invalid file name: make sure it is URL encoded' : 'invalid file name',
    };
  }
}

export async function getMimetype(
  originalMimetype: string,
  extension: string,
): Promise<{ mimetype: string; assumed: boolean }> {
  const mimetype = originalMimetype;

  if (config.files.assumeMimetypes) {
    const mime = await guess(extension.substring(1));

    if (mime) return { mimetype: mime, assumed: true };
  }

  return { mimetype, assumed: false };
}
