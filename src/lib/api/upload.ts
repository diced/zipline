import { extname } from 'path';
import { User } from '@/lib/db/models/user';
import { prisma } from '@/lib/db';
import { bytes } from '@/lib/bytes';
import { config } from '../config';
import { Config } from '../config/validate';
import { sanitizeFilename } from '../fs';
import { formatFileName } from '../uploader/formatFileName';
import { guess, normalizeMimetype } from '../mimes';
import { log } from '../logger';
import { ApiError } from './errors';

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
  alternateExtensions: string[] = [],
): Promise<string> {
  try {
    let fileName = override ? sanitizeFilename(override) : formatFileName(format, originalName);

    if (!fileName) throw 'invalid file name';

    const extensions = [...new Set([extension, ...alternateExtensions])];
    let fullFileNames = extensions.map((ext) => `${fileName}${ext}`);
    let existing =
      fullFileNames.some((name) => reservedNames?.has(name)) ||
      (await prisma.file.findFirst({ where: { name: { in: fullFileNames } } }));

    if (existing && (override || format === 'name')) {
      throw 'file with the same name already exists';
    }

    let dateIncrement = 1;

    while (existing && (format === 'random' || format === 'date')) {
      fileName = formatFileName(format, originalName, dateIncrement++);
      if (!fileName) throw 'invalid file name';

      fullFileNames = extensions.map((ext) => `${fileName}${ext}`);
      existing =
        fullFileNames.some((name) => reservedNames?.has(name)) ||
        (await prisma.file.findFirst({ where: { name: { in: fullFileNames } } }));
    }

    for (const name of fullFileNames) reservedNames?.add(name);
    return fileName;
  } catch (e) {
    logger.warn(`error generating file name: ${e}`);

    if (typeof e === 'string') throw e;
    throw e instanceof URIError ? 'invalid file name: make sure it is URL encoded' : 'invalid file name';
  }
}

export function enforceMimetypePolicy(
  mimetype: string,
  context?: string,
): { mimetype: string; remapped: boolean } {
  const normalized = normalizeMimetype(mimetype) ?? 'application/octet-stream';
  const disabledTypes = new Set(
    config.files.disabledTypes
      .map((type) => normalizeMimetype(type))
      .filter((type): type is string => type !== null),
  );

  if (!disabledTypes.has(normalized)) return { mimetype: normalized, remapped: false };

  const defaultType = normalizeMimetype(config.files.disabledTypesDefault);
  if (defaultType && !disabledTypes.has(defaultType)) return { mimetype: defaultType, remapped: true };

  throw new ApiError(1065, `${context ? `${context}: ` : ''}File type ${normalized} is not allowed`);
}

export async function resolveUploadMimetype(
  originalMimetype: string | null | undefined,
  extension: string,
  context?: string,
): Promise<{ mimetype: string; assumed: boolean; remapped: boolean }> {
  const declaredMimetype = normalizeMimetype(originalMimetype) ?? 'application/octet-stream';
  const assumedMimetype = config.files.assumeMimetypes
    ? normalizeMimetype(await guess(extension.substring(1)))
    : null;
  const assumed = assumedMimetype !== null;
  const resolvedMimetype = assumedMimetype ?? declaredMimetype;
  const enforced = enforceMimetypePolicy(resolvedMimetype, context);

  return { ...enforced, assumed };
}
