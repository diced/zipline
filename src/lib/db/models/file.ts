import { formatRootUrl } from '@/lib/url';
import { config } from '@/lib/config';

export type File = {
  createdAt: Date;
  updatedAt: Date;
  deletesAt: Date | null;
  favorite: boolean;
  id: string;
  originalName: string | null;
  name: string;
  size: number;
  type: string;
  views: number;
  password?: string | boolean | null;
  folderId: string | null;

  url?: string;
};

export const fileSelect = {
  createdAt: true,
  updatedAt: true,
  deletesAt: true,
  favorite: true,
  id: true,
  originalName: true,
  name: true,
  size: true,
  type: true,
  views: true,
  folderId: true,
};

export function cleanFile(file: File) {
  file.password = !!file.password;

  file.url = formatRootUrl(config.files.route, file.name);

  return file;
}

export function cleanFiles(files: File[], stringifyDates = false) {
  for (let i = 0; i !== files.length; ++i) {
    const file = files[i];
    if (file.password) file.password = true;

    (file as any).createdAt = stringifyDates ? file.createdAt.toISOString() : file.createdAt;
    (file as any).updatedAt = stringifyDates ? file.updatedAt.toISOString() : file.updatedAt;
    (file as any).deletesAt = stringifyDates ? file.deletesAt?.toISOString() || null : file.deletesAt;

    file.url = formatRootUrl(config.files.route, file.name);
  }

  return files;
}
