import { NextApiReq, NextApiRes, withZipline } from 'middleware/withZipline';
import prisma from 'lib/prisma';
import { chunk } from 'lib/util';
import Logger from 'lib/logger';
import datasource from 'lib/datasource';

async function handler(req: NextApiReq, res: NextApiRes) {
  const user = await req.user();
  if (!user) return res.forbid('not logged in');

  if (req.method === 'DELETE') {
    if (req.body.all) {
      const files = await prisma.image.findMany({
        where: {
          userId: user.id,
        },
      });

      for (let i = 0; i !== files.length; ++i) {
        await datasource.delete(files[i].file);
      }

      const { count } = await prisma.image.deleteMany({
        where: {
          userId: user.id,
        },
      });
      Logger.get('image').info(`User ${user.username} (${user.id}) deleted ${count} images.`);

      return res.json({ count });
    } else {
      if (!req.body.id) return res.error('no file id');

      const image = await prisma.image.delete({
        where: {
          id: req.body.id,
        },
      });

      await datasource.delete(image.file);

      Logger.get('image').info(`User ${user.username} (${user.id}) deleted an image ${image.file} (${image.id})`);

      delete image.password;
      return res.json(image);
    }
  } else if (req.method === 'PATCH') {
    if (!req.body.id) return res.error('no file id');

    let image;

    if (req.body.favorite !== null) image = await prisma.image.update({
      where: { id: req.body.id },
      data: {
        favorite: req.body.favorite,
      },
    });

    delete image.password;
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
        expires_at: true,
        file: true,
        mimetype: true,
        id: true,
        favorite: true,
      },
    });

  
    // @ts-ignore
    images.map(image => image.url = `/r/${image.file}`);
    if (req.query.filter && req.query.filter === 'media') images = images.filter(x => /^(video|audio|image|text)/.test(x.mimetype));
  
    return res.json(req.query.paged ? chunk(images, 16) : images);
  }
}

export default withZipline(handler);