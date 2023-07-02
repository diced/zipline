import { formatRootUrl } from '@/lib/url';
import { config } from '@/lib/config';

export type File = {
  createdAt: Date;
  updatedAt: Date;
  deletesAt: Date | null;
  favorite: boolean;
  id: string;
  originalName: string;
  name: string;
  path: string;
  size: number;
  type: string;
  views: number;
  zeroWidthSpace: string | null;
  password?: string | boolean | null;

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
  path: true,
  size: true,
  type: true,
  views: true,
  zeroWidthSpace: true,
};

export function cleanFile(file: File) {
  file.password = !!file.password;

  file.url = formatRootUrl(config.files.route, file.name);

  return file;
}

export function cleanFiles(files: File[]) {
  for (let i = 0; i !== files.length; ++i) {
    const file = files[i];
    file.password = !!file.password;

    file.url = formatRootUrl(config.files.route, file.name);
  }

  return files;
}
