import type { File as DbFile } from '@/lib/db/models/file';
import i18n from '@/lib/i18n';
import useSWR from 'swr';
import { isDbFile } from './useFileUrls';

const MAX_BYTES = 1 * 1024 * 1024;
// resolved at read time so the notice follows the active language
const fileBig = () => i18n.t('file:preview.tooBig');

async function readBlobText(file: File) {
  const raw = await file.slice(0, MAX_BYTES).text();

  return file.size > MAX_BYTES ? raw + fileBig() : raw;
}

async function readText(fileUrl: string) {
  const res = await fetch(fileUrl, {
    headers: {
      Range: `bytes=0-${MAX_BYTES - 1}`,
    },
  });

  if (!res.ok) throw new Error('Failed to fetch file');
  return await res.text();
}

export default function useFileContent({
  enabled,
  file,
  fileUrl,
}: {
  enabled: boolean;
  file: DbFile | File;
  fileUrl: string;
}) {
  const { data, error } = useSWR<string>(
    () => {
      if (!enabled) return null;

      if (isDbFile(file)) return ['dbfile', file.id, fileUrl] as const;

      return ['blobfile', file] as const;
    },
    async () => {
      if (!isDbFile(file)) return readBlobText(file as File);
      if (file.size === 0) return '';

      if (file.size > MAX_BYTES) {
        const text = await readText(fileUrl);
        return text + fileBig();
      }

      return readText(fileUrl);
    },
    {
      revalidateOnFocus: false,
      shouldRetryOnError: false,
    },
  );

  if (error) return i18n.t('file:preview.loadError');

  return data;
}
