import { prisma } from '@/lib/db';
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
  const file = await prisma.file.findFirst({
    where: {
      name: decodeURIComponent(id),
    },
    select: {
      name: true,
      type: true,
      password: true,
      User: {
        select: {
          view: true,
        },
      },
    },
  });
  if (!file) return res.callNotFound();

  if (file.User?.view.enabled) return res.redirect(`/view/${encodeURIComponent(file.name)}`);
  if (file.type.startsWith('text/')) return res.redirect(`/view/${encodeURIComponent(file.name)}`);
  if (file.password) return res.redirect(`/view/${encodeURIComponent(file.name)}`);

  return rawFileHandler(req, res);
}
