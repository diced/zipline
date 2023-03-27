import config from 'lib/config';
import datasource from 'lib/datasource';
import Logger from 'lib/logger';
import prisma from 'lib/prisma';
import { NextApiReq, NextApiRes, UserExtended, withZipline } from 'middleware/withZipline';

const logger = Logger.get('files');

async function handler(req: NextApiReq, res: NextApiRes, user: UserExtended) {
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
      logger.info(`User ${user.username} (${user.id}) deleted ${count} files.`);

      return res.json({ count });
    } else {
      if (!req.body.id) return res.badRequest('no file id');

      const image = await prisma.image.delete({
        where: {
          id: req.body.id,
        },
      });

      await datasource.delete(image.file);

      logger.info(`User ${user.username} (${user.id}) deleted an image ${image.file} (${image.id})`);

      delete image.password;
      return res.json(image);
    }
  } else if (req.method === 'PATCH') {
    if (!req.body.id) return res.badRequest('no file id');

    let image;

    if (req.body.favorite !== null)
      image = await prisma.image.update({
        where: { id: req.body.id },
        data: {
          favorite: req.body.favorite,
        },
      });

    delete image.password;
    return res.json(image);
  } else {
    let images: {
      favorite: boolean;
      created_at: Date;
      id: number;
      file: string;
      mimetype: string;
      expires_at: Date;
      maxViews: number;
      views: number;
    }[] = await prisma.image.findMany({
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
        views: true,
        maxViews: true,
      },
    });

    for (let i = 0; i !== images.length; ++i) {
      (images[i] as unknown as { url: string }).url = `${config.uploader.route}/${images[i].file}`;
    }

    if (req.query.filter && req.query.filter === 'media')
      images = images.filter((x) => /^(video|audio|image|text)/.test(x.mimetype));

    return res.json(images);
  }
}

export default withZipline(handler, {
  methods: ['GET', 'DELETE', 'PATCH'],
  user: true,
});
