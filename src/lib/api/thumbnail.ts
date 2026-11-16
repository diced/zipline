import { verifyAccessToken } from '@/lib/accessToken';
import { datasource } from '@/lib/datasource';
import { db } from '@/lib/db';
import type { Role } from '@/lib/db/enums';
import { isThumbnail } from '@/lib/fs';
import { guess } from '@/lib/mimes';
import { canInteract } from '@/lib/role';
import type { FastifyReply } from 'fastify';
import { ApiError } from './errors';

async function getThumbnail(path: string) {
  const rows = await db.query.thumbnails.findMany({
    where: { path },
    limit: 2,
    with: {
      file: {
        columns: {
          id: true,
          name: true,
          userId: true,
          password: true,
          deletesAt: true,
          maxViews: true,
          views: true,
        },
        with: { user: { columns: { role: true } } },
      },
    },
  });

  return rows.length === 1 ? rows[0] : null;
}

type Thumbnail = NonNullable<Awaited<ReturnType<typeof getThumbnail>>>;

export async function sendThumbnail(
  path: string,
  res: FastifyReply,
  { token, user }: { token?: string; user?: { id: string; role: Role } } = {},
) {
  res.header('Cache-Control', 'no-store');

  function canRead(thumbnail: Thumbnail | null): thumbnail is Thumbnail {
    if (!thumbnail?.file) return false;

    const { file } = thumbnail;
    if (isThumbnail(file.name)) return false;
    if (user && file.userId !== user.id && !canInteract(user.role, file.user?.role)) return false;
    if (file.deletesAt && file.deletesAt <= new Date()) return false;
    if (file.maxViews && file.views >= file.maxViews) return false;
    if (file.password && !verifyAccessToken(token, 'file', file.id)) {
      if (user) throw new ApiError(3018);
      return false;
    }

    return true;
  }

  const thumbnail = await getThumbnail(path);
  if (!canRead(thumbnail)) return res.callNotFound();

  const size = await datasource.size(path);
  if (!size) return res.callNotFound();

  const stream = await datasource.get(path);
  if (!stream) return res.callNotFound();

  stream.once('error', () => stream.destroy());

  try {
    const type = await guess(path.split('.').pop() || 'jpg');
    const current = await getThumbnail(path);
    if (!canRead(current) || current.id !== thumbnail.id || current.fileId !== thumbnail.fileId) {
      stream.destroy();

      return res.callNotFound();
    }

    if (stream.errored) throw stream.errored;

    return res.type(type).header('Content-Length', size).status(200).send(stream);
  } catch (error) {
    stream.destroy();
    throw error;
  }
}
