import { PathLike } from 'fs';
import { access } from 'fs/promises';
import { basename, isAbsolute } from 'path';

export async function exists(path: PathLike): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
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
