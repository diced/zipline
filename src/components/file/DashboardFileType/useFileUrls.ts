import { useUserStore } from '@/lib/client/store/user';
import type { File as DbFile } from '@/lib/db/models/file';
import { useMemo } from 'react';

function appendShareOrToken(url: string, token?: string | null, share?: string | null) {
  const params = new URLSearchParams();
  if (token) params.set('token', token);
  if (share) params.set('share', share);
  const qs = params.toString();
  return qs ? `${url}?${qs}` : url;
}

export function isDbFile(file: DbFile | File): file is DbFile {
  return typeof globalThis.File !== 'undefined' ? !(file instanceof globalThis.File) : 'thumbnail' in file;
}

export default function useFileUrls({
  file,
  token,
  share,
}: {
  file: DbFile | File;
  token?: string | null;
  share?: string | null;
}): {
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
        : appendShareOrToken(`/raw/${thumb}`, token, share)
      : null;

    return {
      fileUrl: appendShareOrToken(
        user ? `/api/user/files/${file.id}/raw` : `/raw/${file.name}`,
        token,
        share,
      ),
      viewUrl: appendShareOrToken(`/view/${file.name}`, token, share),
      thumbnailUrl,
    };
  }, [token, share, blobUrl, file, user]);
}
