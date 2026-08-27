import { config } from '@/lib/config';
import { db } from '@/lib/db';
import { filePasswordExtra } from '@/lib/db/models/file';
import { userViewSchema } from '@/lib/db/models/user';
import { escapeLike } from '@/lib/db/utils';
import { sanitizeFilename } from '@/lib/fs';
import { FastifyReply, FastifyRequest } from 'fastify';
import { rawFileHandler } from './raw/[id]';

type Params = {
  id: string;
};

type Query = {
  token?: string;
  download?: string;
};

export async function filesRoute(
  req: FastifyRequest<{ Params: Params; Querystring: Query }>,
  res: FastifyReply,
) {
  const { id } = req.params;
  const name = sanitizeFilename(id);
  if (!name) return res.callNotFound();

  const query = {
    columns: { name: true, type: true },
    extras: filePasswordExtra,
    with: { user: { columns: { view: true } } },
  } as const;
  let file = await db.query.files.findFirst({ ...query, where: { name } });
  if (!file && config.files.extensionlessUrls && !name.includes('.')) {
    file = await db.query.files.findFirst({
      ...query,
      where: { name: { like: `${escapeLike(name)}.%` } },
      orderBy: { createdAt: 'desc' },
    });
  }
  if (!file) return res.callNotFound();
  const view = file.user ? userViewSchema.parse(file.user.view) : null;

  const viewUrl = `/view/${encodeURIComponent(file.name)}`;

  if (file.password) return res.redirect(viewUrl);

  if (file.type.startsWith('text/')) {
    if (view?.disableTextFiles) return rawFileHandler(req, res);

    return res.redirect(viewUrl);
  }

  if (view?.enabled) return res.redirect(viewUrl);

  return rawFileHandler(req, res);
}
