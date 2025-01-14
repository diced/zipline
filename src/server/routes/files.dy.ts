import { verifyPassword } from '@/lib/crypto';
import { datasource } from '@/lib/datasource';
import { prisma } from '@/lib/db';
import { log } from '@/lib/logger';
import { FastifyReply, FastifyRequest } from 'fastify';
import { parse } from 'url';

type Params = {
  id: string;
};

type Query = {
  pw?: string;
  download?: string;
};

const logger = log('routes').c('files');

export async function filesRoute(
  req: FastifyRequest<{ Params: Params; Querystring: Query }>,
  res: FastifyReply,
) {
  const { id } = req.params;
  const { pw, download } = req.query;

  const parsedUrl = parse(req.url!, true);

  const file = await prisma.file.findFirst({
    where: {
      name: decodeURIComponent(id),
    },
    include: {
      User: true,
    },
  });

  if (!file) return req.server.nextServer.render404(req.raw, res.raw, parsedUrl);

  if (file.User?.view.enabled) return res.redirect(`/view/${encodeURIComponent(file.name)}`);

  const stream = await datasource.get(file.name);
  if (!stream) return req.server.nextServer.render404(req.raw, res.raw, parsedUrl);
  if (file.password) {
    if (!pw) return res.redirect(`/view/${encodeURIComponent(file.name)}`);

    const verified = await verifyPassword(pw as string, file.password!);

    if (!verified) {
      logger.warn('password protected file accessed with an incorrect password', { id: file.id, ip: req.ip });

      return req.server.nextServer.render404(req.raw, res.raw, parsedUrl);
    }
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
        'Content-Disposition': `${download ? 'attachment; ' : ''}filename="${encodeURIComponent(file.originalName)}"`,
      }),
    })
    .send(stream);
}
