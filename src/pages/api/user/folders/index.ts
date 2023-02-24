import config from 'lib/config';
import Logger from 'lib/logger';
import prisma from 'lib/prisma';
import { formatRootUrl } from 'lib/utils/urls';
import { NextApiReq, NextApiRes, UserExtended, withZipline } from 'middleware/withZipline';

const logger = Logger.get('folders');

async function handler(req: NextApiReq, res: NextApiRes, user: UserExtended) {
  if (req.method === 'POST') {
    const { name, add }: { name: string; add: string[] } = req.body;
    if (!name) return res.badRequest('name is required');
    if (name.trim() === '') return res.badRequest('name cannot be empty');

    if (add) {
      // add contains a list of file IDs to add to the folder
      const files = await prisma.file.findMany({
        where: {
          id: {
            in: add.map((id) => Number(id)),
          },
          userId: user.id,
        },
      });

      if (files.length !== add.length)
        return res.badRequest(
          `files ${add.filter((id) => !files.find((file) => file.id === Number(id))).join(', ')} not found`
        );

      const folder = await prisma.folder.create({
        data: {
          name,
          userId: user.id,
          files: {
            connect: files.map((file) => ({ id: file.id })),
          },
        },
      });

      logger.debug(`created folder ${JSON.stringify(folder)}`);

      logger.info(`Created folder "${folder.name}" for user ${user.username} (${user.id})`);

      return res.json(folder);
    }

    const folder = await prisma.folder.create({
      data: {
        name,
        userId: user.id,
      },
    });

    logger.debug(`created folder ${JSON.stringify(folder)}`);

    logger.info(`Created folder "${folder.name}" for user ${user.username} (${user.id})`);

    return res.json(folder);
  } else {
    const folders = await prisma.folder.findMany({
      where: {
        userId: user.id,
      },
      select: {
        files: !!req.query.files,
        id: true,
        name: true,
        userId: true,
        createdAt: true,
        updatedAt: true,
        public: true,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    if (req.query.files) {
      for (let i = 0; i !== folders.length; ++i) {
        const folder = folders[i];
        for (let j = 0; j !== folders[i].files.length; ++j) {
          const file = folder.files[j];
          delete file.password;

          (folder.files[j] as unknown as { url: string }).url = formatRootUrl(
            config.uploader.route,
            folder.files[j].name
          );
        }
      }
    }

    return res.json(folders);
  }
}

export default withZipline(handler, {
  methods: ['GET', 'POST'],
  user: true,
});
