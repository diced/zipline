import { extname } from 'path';
import { db, type DbClient } from '@/lib/db';
import { files } from '@/lib/db/schema';
import { User } from '@/lib/db/models/user';
import { bytes } from '@/lib/bytes';
import { count, eq, sum } from 'drizzle-orm';
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
  if (override !== undefined) return override;

  const doubleExtension = commonDoubleExts.find((ext) => filename.toLowerCase().endsWith(ext.toLowerCase()));

  return doubleExtension ? filename.slice(-doubleExtension.length) : extname(filename);
}

export function isExtensionDisabled(extension: string) {
  const normalize = (ext: string) => ext.trim().replace(/^\./, '').toLowerCase();
  const normalizedExtension = normalize(extension);

  return config.files.disabledExtensions.some((ext) => normalize(ext) === normalizedExtension);
}

export async function checkQuota(
  user: Pick<User, 'id' | 'quota'> | null,
  newSize: number,
  fileCount: number,
  client?: DbClient,
): Promise<true | string> {
  if (!user?.quota) return true;

  const rows = await (client ?? db)
    .select({ count: count(), size: sum(files.size) })
    .from(files)
    .where(eq(files.userId, user.id));

  const usage = { count: rows[0]?.count ?? 0, size: Number(rows[0]?.size ?? 0) };
  if (user.quota.filesQuota === 'BY_BYTES') {
    if (usage.size + newSize > bytes(user.quota.maxBytes!))
      return `uploading will exceed your storage quota of ${user.quota.maxBytes}`;

    return true;
  }

  if (usage.count + fileCount > user.quota.maxFiles!)
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

async function fileNameExists(name: string, client: DbClient) {
  const rows = await client.select({ id: files.id }).from(files).where(eq(files.name, name)).limit(1);
  return rows.length > 0;
}

export async function getFilename(
  format: Config['files']['defaultFormat'],
  originalName: string,
  extension: string,
  override?: string,
  client: DbClient = db,
): Promise<string> {
  try {
    let fileName = override ? sanitizeFilename(override) : formatFileName(format, originalName);

    if (!fileName) throw 'invalid file name';

    let existing = await fileNameExists(`${fileName}${extension}`, client);

    if (existing && (override || format === 'name')) {
      throw 'file with the same name already exists';
    }

    let dateIncrement = 1;

    while (existing) {
      fileName = formatFileName(format, originalName, dateIncrement++);
      if (!fileName) throw 'invalid file name';

      existing = await fileNameExists(`${fileName}${extension}`, client);
    }

    if (`${fileName}${extension}`.toLowerCase().startsWith('.thumbnail'))
      throw 'file name uses a reserved prefix';

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
  const assumedMimetype = config.files.assumeMimetypes ? normalizeMimetype(await guess(extension, '')) : null;
  const assumed = assumedMimetype !== null;
  const resolvedMimetype = assumedMimetype ?? declaredMimetype;
  const enforced = enforceMimetypePolicy(resolvedMimetype, context);

  return { ...enforced, assumed };
}
