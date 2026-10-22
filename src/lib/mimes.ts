import { readFile } from 'fs/promises';
import { MIMEType } from 'util';
import type { CodeMeta } from './code';

export type Mimes = [string, string[]][];

const mimes = Promise.all([
  readFile(new URL('../../mimes.json', import.meta.url), 'utf8'),
  readFile(new URL('../../code.json', import.meta.url), 'utf8'),
]).then(([mimeData, codeData]) => {
  const mimeTypes = new Map(
    (JSON.parse(mimeData) as Mimes).map(([extension, types]) => [extension, types[0]]),
  );

  for (const { ext, mime } of JSON.parse(codeData) as CodeMeta[]) {
    const existing = mimeTypes.get(ext);
    if (!existing || existing === 'application/octet-stream') mimeTypes.set(ext, mime);
  }

  return mimeTypes;
});

export async function guess(
  extension?: string | null,
  fallback = 'application/octet-stream',
): Promise<string> {
  if (!extension) return fallback;

  const normalizedExtension = extension.trim().replace(/^\./, '').toLowerCase();
  return (await mimes).get(normalizedExtension) ?? fallback;
}

export function normalizeMimetype(mimetype?: string | null): string | null {
  if (!mimetype?.trim()) return null;

  try {
    return new MIMEType(mimetype.trim()).essence.toLowerCase();
  } catch {
    return null;
  }
}
