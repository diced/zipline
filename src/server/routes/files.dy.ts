import { findFileByName } from '@/lib/db/models/file';
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
  const file = await findFileByName(id, { thumbnail: false, tags: false, owner: true });
  if (!file) return res.callNotFound();

  const viewUrl = `/view/${encodeURIComponent(file.name)}`;

  if (file.password) return res.redirect(viewUrl);

  if (file.type.startsWith('text/')) {
    if (file.User?.view?.disableTextFiles) return rawFileHandler(req, res);

    return res.redirect(viewUrl);
  }

  if (file.User?.view?.enabled) return res.redirect(viewUrl);

  return rawFileHandler(req, res);
}
