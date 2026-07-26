import { readFile } from 'fs/promises';

export type Mimes = [string, string[]][];

const mimes = readFile(new URL('../../mimes.json', import.meta.url), 'utf8').then(
  (data) => new Map((JSON.parse(data) as Mimes).map(([extension, types]) => [extension, types[0]])),
);

export async function guess(extension: string | null): Promise<string> {
  if (!extension) return 'application/octet-stream';

  return (await mimes).get(extension) ?? 'application/octet-stream';
}
