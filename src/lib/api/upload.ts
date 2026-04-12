import { extname } from 'path';
import { User } from '@/lib/db/models/user';
import { prisma } from '@/lib/db';
import { bytes } from '@/lib/bytes';
import { config } from '../config';
import { Config } from '../config/validate';
import { sanitizeFilename } from '../fs';
import { type CustomFormatOptions, formatFileName } from '../uploader/formatFileName';
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
  user: User | null,
  newSize: number,
  fileCount: number,
): Promise<true | string> {
  if (!user?.quota) return true;

  const stats = await prisma.file.aggregate({
    where: {
      userId: user.id,
    },
    _sum: {
      size: true,
    },
    _count: {
      _all: true,
    },
  });

  const aggSize = stats?._sum?.size ? stats._sum.size : 0n;

  if (user.quota.filesQuota === 'BY_BYTES' && Number(aggSize) + newSize > bytes(user.quota.maxBytes!))
    return `uploading will exceed your storage quota of ${user.quota.maxFiles} files`;

  if (user.quota.filesQuota === 'BY_FILES' && stats?._count?._all + fileCount > user.quota.maxFiles!)
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
  customFormatOptions?: CustomFormatOptions,
): Promise<{ error: string } | { fileName: string }> {
  try {
    let fileName = override
      ? sanitizeFilename(override)
      : formatFileName(format, originalName, customFormatOptions);

    if (!fileName) return { error: 'invalid file name' };

    let fullFileName = `${fileName}${extension}`;
    let existing = await prisma.file.findFirst({ where: { name: fullFileName } });

    if (existing && (override || format === 'name')) {
      return { error: 'file with the same name already exists' };
    }

    while (existing && format === 'random') {
      fileName = formatFileName(format, originalName);
      if (!fileName) return { error: 'invalid file name' };

      fullFileName = `${fileName}${extension}`;
      existing = await prisma.file.findFirst({ where: { name: fullFileName } });
    }

    let customFormatAttempts = 0;
    while (existing && format === 'custom' && customFormatAttempts++ < 5) {
      fileName = formatFileName(format, originalName, customFormatOptions);
      if (!fileName) return { error: 'invalid file name' };

      fullFileName = `${fileName}${extension}`;
      existing = await prisma.file.findFirst({ where: { name: fullFileName } });
    }
    if (existing && format === 'custom') {
      return {
        error:
          'file with the same name already exists, and custom format did not produce a unique name after multiple attempts',
      };
    }

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
