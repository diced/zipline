import { PathLike } from 'fs';
import { access } from 'fs/promises';
import { basename, extname, isAbsolute } from 'path';

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

export async function exists(path: PathLike): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export function getExtension(filename: string, override?: string) {
  if (override !== undefined) return override;

  const doubleExtension = commonDoubleExts.find(
    (ext) => filename.length > ext.length && filename.toLowerCase().endsWith(ext.toLowerCase()),
  );

  return doubleExtension ? filename.slice(-doubleExtension.length) : extname(filename);
}

export function sanitizeFilename(name: string): string | null {
  if (!name || name === '.' || name === '..' || name.includes('\0')) return null;
  if (name.includes('/') || name.includes('\\') || isAbsolute(name) || basename(name) !== name) return null;

  return name;
}

export function sanitizeExtension(ext: string): string | null {
  if (ext.includes('/') || ext.includes('\\') || ext.includes('..')) return null;

  return ext.startsWith('.') ? ext : `.${ext}`;
}
