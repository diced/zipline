import config from 'lib/config';
import datasource from 'lib/datasource';
import Logger from 'lib/logger';
import prisma from 'lib/prisma';
import { formatRootUrl } from 'lib/utils/urls';
import { NextApiReq, NextApiRes, UserExtended, withZipline } from 'middleware/withZipline';

const logger = Logger.get('files');

async function handler(req: NextApiReq, res: NextApiRes, user: UserExtended) {
  if (req.method === 'DELETE') {
    if (req.body.all) {
      const files = await prisma.file.findMany({
        where: {
          userId: user.id,
        },
      });

      for (let i = 0; i !== files.length; ++i) {
        await datasource.delete(files[i].name);
      }

      const { count } = await prisma.file.deleteMany({
        where: {
          userId: user.id,
        },
      });
      logger.info(`User ${user.username} (${user.id}) deleted ${count} files.`);

      return res.json({ count });
    } else {
      if (!req.body.id) return res.badRequest('no file id');

      const file = await prisma.file.delete({
        where: {
          id: req.body.id,
        },
      });

      await datasource.delete(file.name);

      logger.info(`User ${user.username} (${user.id}) deleted an image ${file.name} (${file.id})`);

      // @ts-ignore
      if (file.password) file.password = true;

      return res.json(file);
    }
  } else if (req.method === 'PATCH') {
    if (!req.body.id) return res.badRequest('no file id');

    let file;

    if (req.body.favorite !== null)
      file = await prisma.file.update({
        where: { id: req.body.id },
        data: {
          favorite: req.body.favorite,
        },
      });

    // @ts-ignore
    if (file.password) file.password = true;
    return res.json(file);
  } else if (req.method === 'HEAD') {
    if (!req.body.id) return res.badRequest('no file id');

    let file;

    if (req.body.lock !== null)
      file = await prisma.file.update({
        where: { id: req.body.id },
        data: {
          lock: req.body.lock,
        },
      });

    // @ts-ignore
    if (file.password) file.password = true;
    return res.json(file);
  } else {
    if (req.query.count) {
      const count = await prisma.file.count({
        where: {
          userId: user.id,
          favorite: !!req.query.favorite,
        },
      });

      return res.json({ count });
    }
    let files: {
      favorite: boolean;
      createdAt: Date;
      id: number;
      name: string;
      mimetype: string;
      expiresAt: Date;
      maxViews: number;
      views: number;
      size: number;
      originalName: string;
    }[] = await prisma.file.findMany({
      where: {
        userId: user.id,
        favorite: !!req.query.favorite,
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        createdAt: true,
        expiresAt: true,
        name: true,
        mimetype: true,
        id: true,
        favorite: true,
        views: true,
        folderId: true,
        maxViews: true,
        size: true,
        originalName: true,
      },
    });

    for (let i = 0; i !== files.length; ++i) {
      (files[i] as unknown as { url: string }).url = formatRootUrl(config.uploader.route, files[i].name);
    }

    if (req.query.filter && req.query.filter === 'media')
      files = files.filter((x) => /^(video|audio|image|text)/.test(x.mimetype));

    return res.json(files);
  }
}

export default withZipline(handler, {
  methods: ['GET', 'DELETE', 'PATCH', 'HEAD'],
  user: true,
});
