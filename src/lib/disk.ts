import { statfs } from 'fs/promises';
import { config } from './config';
import { datasource } from './datasource';
import z from 'zod';

export const diskStatusSchema = z.object({
  used: z.number(),
  total: z.number().nullable(),
  available: z.number().nullable(),
  path: z.string(),
});

export type DiskStatus = z.infer<typeof diskStatusSchema>;

async function localDiskStatus() {
  const path = config.datasource.local!.directory;
  const stats = await statfs(path);

  const total = stats.blocks * stats.bsize;
  const available = stats.bavail * stats.bsize;
  const used = total - stats.bfree * stats.bsize;

  return { used, total, available, path };
}

async function s3DiskStatus() {
  const s3 = config.datasource.s3!;
  const totalSize = await datasource.totalSize();
  const path = `${s3.bucket}${s3.subdirectory ? `/${s3.subdirectory.replace(/\/$/, '')}` : ''}`;

  return {
    used: totalSize,
    total: null,
    available: null,
    path,
  };
}

export async function diskStatus() {
  return config.datasource.type === 'local' ? localDiskStatus() : s3DiskStatus();
}
