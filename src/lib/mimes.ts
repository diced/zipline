import { readFile } from 'fs/promises';
import { MIMEType } from 'util';

export type Mimes = [string, string[]][];

const mimes = readFile(new URL('../../mimes.json', import.meta.url), 'utf8').then(
  (data) => new Map((JSON.parse(data) as Mimes).map(([extension, types]) => [extension, types[0]])),
);

export async function guess(extension?: string | null): Promise<string> {
  if (!extension) return 'application/octet-stream';

  const normalizedExtension = extension.trim().replace(/^\./, '').toLowerCase();
  return (await mimes).get(normalizedExtension) ?? 'application/octet-stream';
}

export function normalizeMimetype(mimetype?: string | null): string | null {
  if (!mimetype?.trim()) return null;

  try {
    return new MIMEType(mimetype.trim()).essence.toLowerCase();
  } catch {
    return null;
  }
}
