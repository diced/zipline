import { PathLike } from 'fs';
import { access } from 'fs/promises';
import { basename, isAbsolute, normalize, sep } from 'path';

export async function exists(path: PathLike): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export function sanitizeFilename(name: string): string | null {
  const decoded = decodeURIComponent(name);
  const normalized = normalize(decoded);

  if (normalized.includes('/') || normalized.includes('\\')) return null;

  if (isAbsolute(normalized)) return null;

  if (normalized.includes('..' + sep) || normalized === '..') return null;

  return basename(normalized);
}
