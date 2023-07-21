import { NextServer } from 'next/dist/server/next';
import express, { Request, Response } from 'express';
import { parse } from 'url';
import { prisma } from '@/lib/db';
import { config } from '@/lib/config';
import { log } from '@/lib/logger';

const logger = log('server').c('urls');

export async function urlsRoute(
  this: ReturnType<typeof express>,
  app: NextServer,
  req: Request,
  res: Response
) {
  const { id } = req.params;

  const parsedUrl = parse(req.url!, true);

  const url = await prisma.url.findFirst({
    where: {
      OR: [{ code: id }, { vanity: id }],
    },
  });
  if (!url) return app.render404(req, res, parsedUrl);

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

    return app.render404(req, res, parsedUrl);
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
