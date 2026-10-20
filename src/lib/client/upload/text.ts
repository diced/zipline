import type { CodeMeta } from '@/lib/code';

export type TextFile = {
  text: string;
  lang: string;
};

export function createTextFiles(files: TextFile[], codeMap: CodeMeta[]): File[] {
  return files.map(
    (file) =>
      new File([file.text], `text.${file.lang}`, {
        type: codeMap.find((meta) => meta.ext === file.lang)?.mime,
        lastModified: Date.now(),
      }),
  );
}
