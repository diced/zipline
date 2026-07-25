import { File } from '@/lib/db/models/file';

export type Share = {
  id: string;
  token: string;
  expiresAt: string | null;
  maxViews: number | null;
  views: number;
  createdAt: string;
};

export async function createFileShare(
  file: File,
  options?: { expiresAt?: string | null; maxViews?: number | null; password?: string | null },
): Promise<{ share: Share; url: string }> {
  const res = await fetch(`/api/user/files/${file.id}/share`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(options ?? {}),
  });

  if (!res.ok) throw new Error(`failed to create share: ${res.status}`);

  return res.json();
}

export async function listFileShares(file: File): Promise<{ shares: Share[] }> {
  const res = await fetch(`/api/user/files/${file.id}/share`);
  if (!res.ok) throw new Error(`failed to list shares: ${res.status}`);

  return res.json();
}

export async function revokeFileShare(file: File, shareId: string): Promise<void> {
  const res = await fetch(`/api/user/files/${file.id}/share/${shareId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`failed to revoke share: ${res.status}`);
}
