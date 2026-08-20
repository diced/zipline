import { getFileByName } from '@/lib/db/models/file';
import { userViewSchema } from '@/lib/db/models/user';
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
  const file = await getFileByName(id, 'route');
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
