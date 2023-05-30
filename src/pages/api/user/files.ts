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

      let file = await prisma.file.findFirst({
        where: {
          id: req.body.id,
          userId: user.id,
        },
        include: {
          user: {
            select: {
              administrator: true,
              superAdmin: true,
              username: true,
              id: true,
            },
          },
        },
      });

      if (!file && (!user.administrator || !user.superAdmin)) return res.notFound('file not found');

      file = await prisma.file.delete({
        where: {
          id: req.body.id,
        },
        include: {
          user: {
            select: {
              administrator: true,
              superAdmin: true,
              username: true,
              id: true,
            },
          },
        },
      });

      await datasource.delete(file.name);

      logger.info(
        `User ${user.username} (${user.id}) deleted an image ${file.name} (${file.id}) owned by ${file.user.username} (${file.user.id})`
      );

      // @ts-ignore
      if (file.password) file.password = true;

      return res.json(file);
    }
  } else if (req.method === 'PATCH') {
    if (!req.body.id) return res.badRequest('no file id');

    let file;

    if (req.body.favorite !== null) {
      file = await prisma.file.findFirst({
        where: {
          id: req.body.id,
          userId: user.id,
        },
        include: {
          user: {
            select: {
              administrator: true,
              superAdmin: true,
              username: true,
              id: true,
            },
          },
        },
      });

      if (!file && (!user.administrator || !user.superAdmin)) return res.notFound('file not found');

      file = await prisma.file.update({
        where: { id: req.body.id },
        data: {
          favorite: req.body.favorite,
        },
      });
    }
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
      thumbnail?: { name: string };
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
        thumbnail: true,
      },
    });

    for (let i = 0; i !== files.length; ++i) {
      (files[i] as unknown as { url: string }).url = formatRootUrl(config.uploader.route, files[i].name);

      if (files[i].thumbnail) {
        (files[i].thumbnail as unknown as string) = formatRootUrl('/r', files[i].thumbnail.name);
      }
    }

    if (req.query.filter && req.query.filter === 'media')
      files = files.filter((x) => /^(video|audio|image|text)/.test(x.mimetype));

    return res.json(files);
  }
}

export default withZipline(handler, {
  methods: ['GET', 'DELETE', 'PATCH'],
  user: true,
});
