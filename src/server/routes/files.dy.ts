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
  const file = await findFileByName(id, {
    include: {
      User: true,
    },
  });
  if (!file) return res.callNotFound();

  if (file.User?.view.enabled) return res.redirect(`/view/${encodeURIComponent(file.name)}`);
  if (file.type.startsWith('text/')) return res.redirect(`/view/${encodeURIComponent(file.name)}`);
  if (file.password) return res.redirect(`/view/${encodeURIComponent(file.name)}`);

  return rawFileHandler(req, res);
}
