import Logger from 'lib/logger';
import prisma from 'lib/prisma';
import { formatRootUrl } from 'lib/utils/urls';
import { NextApiReq, NextApiRes, UserExtended, withZipline } from 'middleware/withZipline';

const logger = Logger.get('folders');

async function handler(req: NextApiReq, res: NextApiRes, user: UserExtended) {
  const { id } = req.query as { id: string };
  const idParsed = Number(id);

  if (isNaN(idParsed)) return res.badRequest('id must be a number');

  const folder = await prisma.folder.findUnique({
    where: {
      id: idParsed,
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
  });

  if (!folder) return res.notFound('folder not found');

  if (folder.userId !== user.id) return res.forbidden('you do not have permission to access this folder');

  if (req.method === 'POST') {
    const { file: fileId }: { file: string } = req.body;
    if (!fileId) return res.badRequest('file is required');
    const fileIdParsed = Number(fileId);

    if (isNaN(fileIdParsed)) return res.badRequest('file must be a number');

    const file = await prisma.file.findUnique({
      where: {
        id: fileIdParsed,
      },
    });

    if (!file) return res.notFound('file not found');

    if (file.userId !== user.id) return res.forbidden('you do not have permission to access this file');

    const fileInFolder = await prisma.file.findFirst({
      where: {
        id: fileIdParsed,
        folder: {
          id: idParsed,
        },
      },
    });

    if (fileInFolder) return res.badRequest('file is already in folder');

    const folder = await prisma.folder.update({
      where: {
        id: idParsed,
      },
      data: {
        files: {
          connect: {
            id: fileIdParsed,
          },
        },
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
    });

    logger.debug(`added file ${fileIdParsed} to folder ${idParsed}`);

    logger.info(
      `Added file "${file.name}" to folder "${folder.name}" for user ${user.username} (${user.id})`,
    );

    if (req.query.files) {
      for (let i = 0; i !== folder.files.length; ++i) {
        const file = folder.files[i];
        // @ts-ignore
        if (file.password) file.password = true;

        (folder.files[i] as unknown as { url: string }).url = formatRootUrl(
          config.uploader.route,
          folder.files[i].name,
        );
      }
    }

    return res.json(folder);
  } else if (req.method === 'PATCH') {
    const { public: publicFolder } = req.body as { public?: string };

    const folder = await prisma.folder.update({
      where: {
        id: idParsed,
      },
      data: {
        public: !!publicFolder,
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
    });

    if (req.query.files) {
      for (let i = 0; i !== folder.files.length; ++i) {
        const file = folder.files[i];
        // @ts-ignore
        if (file.password) file.password = true;

        (folder.files[i] as unknown as { url: string }).url = formatRootUrl(
          config.uploader.route,
          folder.files[i].name,
        );
      }
    }

    return res.json(folder);
  } else if (req.method === 'DELETE') {
    const deletingFolder = !!req.body.deleteFolder;

    if (deletingFolder) {
      const folder = await prisma.folder.delete({
        where: {
          id: idParsed,
        },
        select: {
          id: true,
          name: true,
          userId: true,
          createdAt: true,
          updatedAt: true,
          public: true,
        },
      });

      logger.debug(`deleted folder ${idParsed}`);

      logger.info(`Deleted folder "${folder.name}" for user ${user.username} (${user.id})`);

      return res.json(folder);
    } else {
      const { file: fileId }: { file: string } = req.body;

      if (!fileId) return res.badRequest('file is required');

      const fileIdParsed = Number(fileId);

      if (isNaN(fileIdParsed)) return res.badRequest('file must be a number');

      const file = await prisma.file.findUnique({
        where: {
          id: fileIdParsed,
        },
      });

      if (!file) return res.notFound('file not found');

      if (file.userId !== user.id) return res.forbidden('you do not have permission to access this file');

      const fileInFolder = await prisma.file.findFirst({
        where: {
          id: fileIdParsed,
          folder: {
            id: idParsed,
          },
        },
      });

      if (!fileInFolder) return res.badRequest('file is not in folder');

      const folder = await prisma.folder.update({
        where: {
          id: idParsed,
        },
        data: {
          files: {
            disconnect: {
              id: fileIdParsed,
            },
          },
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
      });

      logger.debug(`removed file ${fileIdParsed} from folder ${idParsed}`);

      logger.info(
        `Removed file "${file.name}" from folder "${folder.name}" for user ${user.username} (${user.id})`,
      );

      if (req.query.files) {
        for (let i = 0; i !== folder.files.length; ++i) {
          const file = folder.files[i];
          // @ts-ignore
          if (file.password) file.password = true;

          (folder.files[i] as unknown as { url: string }).url = formatRootUrl(
            config.uploader.route,
            folder.files[i].name,
          );
        }
      }

      return res.json(folder);
    }
  } else {
    if (req.query.files) {
      for (let i = 0; i !== folder.files.length; ++i) {
        const file = folder.files[i];
        // @ts-ignore
        if (file.password) file.password = true;

        (folder.files[i] as unknown as { url: string }).url = formatRootUrl(
          config.uploader.route,
          folder.files[i].name,
        );
      }
    }

    return res.json(folder);
  }
}

export default withZipline(handler, {
  methods: ['GET', 'POST', 'DELETE', 'PATCH'],
  user: true,
});
