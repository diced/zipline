import { readFile } from 'fs/promises';

export type Mimes = [string, string[]][];

export async function guess(extension: string | null): Promise<string> {
  if (!extension) return 'application/octet-stream';

  const mimes: Mimes = JSON.parse(await readFile('./mimes.json', 'utf8'));

  const mime = mimes.find((x) => x[0] === extension);
  if (!mime) return 'application/octet-stream';

  return mime[1][0];
}
