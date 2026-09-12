import { useUserStore } from '@/lib/client/store/user';
import type { File as DbFile } from '@/lib/db/models/file';
import { formatRootUrl } from '@/lib/url';
import { useMemo } from 'react';

export function isDbFile(file: DbFile | File): file is DbFile {
  return typeof globalThis.File !== 'undefined' ? !(file instanceof globalThis.File) : 'thumbnail' in file;
}

export default function useFileUrls({ file, token }: { file: DbFile | File; token?: string | null }): {
  fileUrl: string;
  thumbnailUrl: string | null;
  viewUrl: string | null;
} {
  const user = useUserStore((state) => state.user);

  const blobUrl = useMemo(() => (isDbFile(file) ? null : URL.createObjectURL(file as File)), [file]);

  return useMemo(() => {
    if (!isDbFile(file)) return { fileUrl: blobUrl ?? '', thumbnailUrl: null, viewUrl: null };

    const thumb = file.thumbnail?.path;
    const thumbnailUrl = thumb
      ? user
        ? `/api/user/files/${thumb}/raw`
        : formatRootUrl('/raw', thumb)
      : null;

    return {
      fileUrl: user
        ? formatRootUrl(`/api/user/files/${file.id}`, 'raw', { token })
        : formatRootUrl('/raw', file.name, { token }),
      viewUrl: formatRootUrl('/view', file.name, { token }),
      thumbnailUrl,
    };
  }, [token, blobUrl, file, user]);
}
