import { datasource } from '@/lib/datasource';
import { prisma } from '@/lib/db';
import { log } from '@/lib/logger';
import { combine } from '@/lib/middleware/combine';
import { method } from '@/lib/middleware/method';
import { ziplineAuth } from '@/lib/middleware/ziplineAuth';
import { NextApiReq, NextApiRes } from '@/lib/response';

export type ApiUserFilesTransactionResponse = {
  count: number;
  name?: string;
};

type Body = {
  files: string[];

  favorite?: boolean;

  folder?: string;

  delete_datasourceFiles?: boolean;
};

const logger = log('api').c('user').c('files').c('transaction');

export async function handler(req: NextApiReq<Body>, res: NextApiRes<ApiUserFilesTransactionResponse>) {
  const { files, favorite, folder } = req.body;

  if (!files || !files.length) return res.badRequest('Cannot process transaction without files');

  if (req.method === 'DELETE') {
    const { delete_datasourceFiles } = req.body;

    logger.debug('preparing transaction', {
      action: 'delete',
      files: files.length,
    });

    if (delete_datasourceFiles) {
      const dFiles = await prisma.file.findMany({
        where: {
          id: {
            in: files,
          },
        },
      });

      for (let i = 0; i !== dFiles.length; ++i) {
        await datasource.delete(dFiles[i].name);
      }

      logger.info(`${req.user.username} deleted ${dFiles.length} files from datasource`, {
        user: req.user.id,
      });
    }

    const resp = await prisma.file.deleteMany({
      where: {
        id: {
          in: files,
        },
      },
    });

    logger.info(`${req.user.username} deleted ${resp.count} files`, {
      user: req.user.id,
    });

    return res.ok(resp);
  }

  if (favorite) {
    const resp = await prisma.file.updateMany({
      where: {
        id: {
          in: files,
        },
      },

      data: {
        favorite: favorite ?? false,
      },
    });

    logger.info(`${req.user.username} ${favorite ? 'favorited' : 'unfavorited'} ${resp.count} files`, {
      user: req.user.id,
    });

    return res.ok(resp);
  }

  if (!folder) return res.badRequest("can't PATCH without an action");

  const f = await prisma.folder.findUnique({
    where: {
      id: folder,
      userId: req.user.id,
    },
  });
  if (!f) return res.notFound('folder not found');

  const resp = await prisma.file.updateMany({
    where: {
      id: {
        in: files,
      },
    },

    data: {
      folderId: folder,
    },
  });

  logger.info(`${req.user.username} moved ${resp.count} files to ${f.name}`, {
    user: req.user.id,
    folderId: f.id,
  });

  return res.ok({
    ...resp,
    name: f.name,
  });
}

export default combine([method(['DELETE', 'PATCH']), ziplineAuth()], handler);
