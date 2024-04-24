import { verifyPassword } from '@/lib/crypto';
import { datasource } from '@/lib/datasource';
import { prisma } from '@/lib/db';
import { FastifyReply, FastifyRequest } from 'fastify';
import { parse } from 'url';

type Params = {
  id: string;
};

type Query = {
  pw?: string;
  download?: string;
};

export async function filesRoute(
  req: FastifyRequest<{ Params: Params; Querystring: Query }>,
  res: FastifyReply,
) {
  const { id } = req.params;
  const { pw, download } = req.query;

  const parsedUrl = parse(req.url!, true);

  const file = await prisma.file.findFirst({
    where: {
      name: id,
    },
    include: {
      User: true,
    },
  });

  if (!file) return req.server.nextServer.render404(req.raw, res.raw, parsedUrl);

  if (file.User?.view.enabled) return res.redirect(`/view/${file.name}`);

  const stream = await datasource.get(file.name);
  if (!stream) return req.server.nextServer.render404(req.raw, res.raw, parsedUrl);
  if (file.password) {
    if (!pw) return res.forbidden('Password protected.');
    const verified = await verifyPassword(pw as string, file.password!);

    if (!verified) return res.forbidden('Incorrect password.');
  }

  await prisma.file.update({
    where: {
      id: file.id,
    },
    data: {
      views: {
        increment: 1,
      },
    },
  });

  return res
    .headers({
      'Content-Type': file.type || 'application/octet-stream',
      'Content-Length': file.size,
      ...(file.originalName && {
        'Content-Disposition': `${download ? 'attachment; ' : ''}filename="${file.originalName}"`,
      }),
    })
    .send(stream);
}
