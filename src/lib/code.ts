import { readFile } from 'fs/promises';
import { extname } from 'path';

export type CodeMeta = {
  ext: string;
  name: string;
  mime: string;
  language?: string;
};

export async function isCode(file: string) {
  const codeMeta: CodeMeta[] = JSON.parse(await readFile('./code.json', 'utf8'));
  const ext = extname(file).slice(1).toLowerCase();

  return codeMeta.some((meta) => meta.ext === ext);
}
