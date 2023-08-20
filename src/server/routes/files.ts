import { config } from '@/lib/config';
import { verifyPassword } from '@/lib/crypto';
import { datasource } from '@/lib/datasource';
import { prisma } from '@/lib/db';
import { log } from '@/lib/logger';
import express, { Request, Response } from 'express';
import { NextServer } from 'next/dist/server/next';
import { parse } from 'url';

const logger = log('server').c('files');

export async function filesRoute(
  this: ReturnType<typeof express>,
  app: NextServer,
  req: Request,
  res: Response,
) {
  const { id } = req.params;
  const { pw } = req.query;

  const parsedUrl = parse(req.url!, true);

  const file = await prisma.file.findFirst({
    where: {
      name: id,
    },
    include: {
      User: true,
    },
  });

  if (!file) return app.render404(req, res, parsedUrl);

  if (file.maxViews && file.views >= file.maxViews) {
    if (config.features.deleteOnMaxViews) {
      await prisma.file.delete({
        where: {
          id: file.id,
        },
      });

      logger.info(`${file.name} deleted due to reaching max views`, {
        id: file.id,
        views: file.views,
      });
    }

    return app.render404(req, res, parsedUrl);
  }

  if (file.User?.view.enabled) return res.redirect(`/view/${file.name}`);

  const stream = await datasource.get(file.name);
  if (!stream) return app.render404(req, res, parsedUrl);
  if (file.password) {
    if (!pw) return res.status(403).json({ code: 403, message: 'Password protected.' });
    const verified = await verifyPassword(pw as string, file.password!);

    if (!verified) return res.status(403).json({ code: 403, message: 'Incorrect password.' });
  }

  res.setHeader('Content-Type', 'text/plain');
  res.setHeader('Content-Length', file.size);
  file.originalName &&
    res.setHeader(
      'Content-Disposition',
      `${req.query.download ? 'attachment; ' : ''}filename="${file.originalName}"`,
    );

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

  stream.pipe(res);
}
