import { datasource } from '@/lib/datasource';
import { prisma } from '@/lib/db';
import { File, cleanFiles, fileSelect } from '@/lib/db/models/file';
import { log } from '@/lib/logger';
import { combine } from '@/lib/middleware/combine';
import { method } from '@/lib/middleware/method';
import { ziplineAuth } from '@/lib/middleware/ziplineAuth';
import { NextApiReq, NextApiRes } from '@/lib/response';
import { canInteract } from '@/lib/role';
import { Prisma } from '@prisma/client';
import { z } from 'zod';

export type ApiUserFilesTransactionResponse = {
  count: number;
};

type Body = {
  files: string[];

  favorite?: boolean;

  delete_datasourceFiles?: boolean;
};

const logger = log('api').c('user').c('files').c('transaction');

export async function handler(req: NextApiReq<Body>, res: NextApiRes<ApiUserFilesTransactionResponse>) {
  const { files, favorite } = req.body;

  if (!files || !files.length) return res.badRequest('Cannot process transaction without files');

  if (req.method === 'DELETE') {
    const { delete_datasourceFiles } = req.body;

    logger.debug(`preparing transaction`, {
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

export default combine([method(['DELETE', 'PATCH']), ziplineAuth()], handler);
