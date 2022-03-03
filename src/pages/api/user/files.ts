import { NextApiReq, NextApiRes, withZipline } from 'middleware/withZipline';
import prisma from 'lib/prisma';
import config from 'lib/config';
import { chunk } from 'lib/util';
import { rm } from 'fs/promises';
import { join } from 'path';
import Logger from 'lib/logger';

async function handler(req: NextApiReq, res: NextApiRes) {
  const user = await req.user();
  if (!user) return res.forbid('not logged in');

  if (req.method === 'DELETE') {
    if (!req.body.id) return res.error('no file id');

    const image = await prisma.image.delete({
      where: {
        id: req.body.id,
      },
    });

    await rm(join(process.cwd(), config.uploader.directory, image.file));

    Logger.get('image').info(`User ${user.username} (${user.id}) deleted an image ${image.file} (${image.id})`);

    return res.json(image);
  } else if (req.method === 'PATCH') {
    if (!req.body.id) return res.error('no file id');

    let image;

    if (req.body.favorite !== null) image = await prisma.image.update({
      where: { id: req.body.id },
      data: {
        favorite: req.body.favorite,
      },
    });

    return res.json(image);
  } else {
    let images = await prisma.image.findMany({
      where: {
        userId: user.id,
        favorite: !!req.query.favorite,
      },
      orderBy: {
        created_at: 'desc',
      },
      select: {
        created_at: true,
        file: true,
        mimetype: true,
        id: true,
        favorite: true,
      },
    });

  
    // @ts-ignore
    images.map(image => image.url = `/r/${image.file}`);
    if (req.query.filter && req.query.filter === 'media') images = images.filter(x => /^(video|audio|image)/.test(x.mimetype));
  
    return res.json(req.query.paged ? chunk(images, 16) : images);
  }
}

export default withZipline(handler);