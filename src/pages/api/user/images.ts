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
        id: req.body.id 
      }
    });

    await rm(join(process.cwd(), config.uploader.directory, image.file));

    Logger.get('image').info(`User ${user.username} (${user.id}) deleted an image ${image.file} (${image.id})`);

    return res.json(image);
  } else {
    const images = await prisma.image.findMany({
      where: {
        user
      },
      select: {
        created_at: true,
        file: true,
        mimetype: true,
        id: true
      }
    });

  
    // @ts-ignore
    images.map(image => image.url = `${config.uploader.route}/${image.file}`);
  
    return res.json(req.query.paged ? chunk(images, 16) : images);
  }
}

export default withZipline(handler);