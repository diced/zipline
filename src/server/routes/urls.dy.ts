import { config } from '@/lib/config';
import { verifyPassword } from '@/lib/crypto';
import { prisma } from '@/lib/db';
import { log } from '@/lib/logger';
import { FastifyReply, FastifyRequest } from 'fastify';
import { parse } from 'url';

type Params = {
  id: string;
};

type Query = {
  pw?: string;
};

const logger = log('server').c('urls');

export async function urlsRoute(
  req: FastifyRequest<{ Params: Params; Querystring: Query }>,
  res: FastifyReply,
) {
  const { id } = req.params;
  const { pw } = req.query;

  const parsedUrl = parse(req.url!, true);

  const url = await prisma.url.findFirst({
    where: {
      OR: [{ code: id }, { vanity: id }, { id }],
    },
  });
  if (!url) return req.server.nextServer.render404(req.raw, res.raw, parsedUrl);

  if (url.maxViews && url.views >= url.maxViews) {
    if (config.features.deleteOnMaxViews) {
      await prisma.url.delete({
        where: {
          id: url.id,
        },
      });

      logger.info(`${url.code} deleted due to reaching max views`, {
        id: url.id,
        views: url.views,
        vanity: url.vanity ?? 'none',
      });
    }

    return req.server.nextServer.render404(req.raw, res.raw, parsedUrl);
  }

  if (url.password) {
    if (!pw) return res.redirect(`/view/url/${url.id}`);
    const verified = await verifyPassword(pw as string, url.password);

    if (!verified) return res.redirect(`/view/url/${url.id}`);
  }

  await prisma.url.update({
    where: {
      id: url.id,
    },
    data: {
      views: {
        increment: 1,
      },
    },
  });

  return res.redirect(url.destination);
}
