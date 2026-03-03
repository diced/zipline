import { ApiError } from '@/lib/api/errors';
import { datasource } from '@/lib/datasource';
import { prisma } from '@/lib/db';
import { log } from '@/lib/logger';
import { secondlyRatelimit } from '@/lib/ratelimits';
import { canInteract } from '@/lib/role';
import { Role } from '@/prisma/client';
import { userMiddleware } from '@/server/middleware/user';
import typedPlugin from '@/server/typedPlugin';
import z from 'zod';

export type ApiUserFilesTransactionResponse = {
  count: number;
  name?: string;
};

const logger = log('api').c('user').c('files').c('transaction');

function checkInteraction(
  current: { id: string; role: Role },
  roles: { id: string; role: Role }[],
): number[] {
  const indices: number[] = [];

  for (let i = 0; i !== roles.length; ++i) {
    if (roles[i].id === current.id) continue;

    if (!canInteract(current.role, roles[i].role)) {
      indices.push(i);
    }
  }

  return indices;
}

export const PATH = '/api/user/files/transaction';
export default typedPlugin(
  async (server) => {
    server.patch(
      PATH,
      {
        schema: {
          description: 'Bulk update files owned by the user: favorite/unfavorite or move them into a folder.',
          body: z.object({
            files: z.array(z.string()).min(1),
            favorite: z.boolean().optional(),
            folder: z.string().optional(),
          }),
          response: {
            200: z.object({
              count: z.number(),
              name: z.string().optional(),
            }),
          },
        },
        preHandler: [userMiddleware],
        ...secondlyRatelimit(2),
      },
      async (req, res) => {
        const { files, favorite, folder } = req.body;

        if (typeof favorite === 'boolean') {
          const toFavoriteFiles = await prisma.file.findMany({
            where: {
              id: { in: files },
            },
            include: {
              User: true,
            },
          });

          const invalids = checkInteraction(
            { id: req.user.id, role: req.user.role },
            toFavoriteFiles.map((f) => ({ id: f.userId ?? '', role: f.User?.role ?? 'USER' })),
          );
          if (invalids.length > 0)
            throw new ApiError(3014, `You don't have the permission to modify files[${invalids.join(', ')}]`);

          const resp = await prisma.file.updateMany({
            where: {
              id: {
                in: files,
              },
            },
            data: {
              favorite: favorite,
            },
          });

          if (resp.count === 0) throw new ApiError(1028);

          logger.info(`${req.user.username} ${favorite ? 'favorited' : 'unfavorited'} ${resp.count} files`, {
            user: req.user.id,
            owners: toFavoriteFiles.map((f) => f.userId),
          });

          return res.send(resp);
        }

        if (!folder) throw new ApiError(1020);

        const f = await prisma.folder.findUnique({
          where: {
            id: folder,
            userId: req.user.id,
          },
        });
        if (!f) throw new ApiError(4001);

        const resp = await prisma.file.updateMany({
          where: {
            id: {
              in: files,
            },
            userId: req.user.id,
          },

          data: {
            folderId: folder,
          },
        });

        if (resp.count === 0) throw new ApiError(4006);

        logger.info(`${req.user.username} moved ${resp.count} files to ${f.name}`, {
          user: req.user.id,
          folderId: f.id,
        });

        return res.send({
          ...resp,
          name: f.name,
        });
      },
    );

    server.delete(
      PATH,
      {
        schema: {
          description: 'Bulk delete files (and optionally delete the underlying datasource objects).',
          body: z.object({
            files: z.array(z.string()).min(1),
            delete_datasourceFiles: z.boolean().optional(),
          }),
          response: {
            200: z.object({
              count: z.number(),
            }),
          },
        },
        preHandler: [userMiddleware],
        ...secondlyRatelimit(2),
      },
      async (req, res) => {
        const { files } = req.body;

        const { delete_datasourceFiles } = req.body;

        logger.debug('preparing transaction', {
          action: 'delete',
          files: files.length,
        });

        const toDeleteFiles = await prisma.file.findMany({
          where: {
            id: { in: files },
          },
          include: {
            User: true,
          },
        });

        const invalids = checkInteraction(
          { id: req.user.id, role: req.user.role },
          toDeleteFiles.map((f) => ({ id: f.userId ?? '', role: f.User?.role ?? 'USER' })),
        );
        if (invalids.length > 0)
          throw new ApiError(3013, `You don't have the permission to delete files[${invalids.join(', ')}]`);

        if (delete_datasourceFiles) {
          for (let i = 0; i !== toDeleteFiles.length; ++i) {
            await datasource.delete(toDeleteFiles[i].name);
          }

          logger.info(`${req.user.username} deleted ${toDeleteFiles.length} files from datasource`, {
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

        if (resp.count === 0) throw new ApiError(1027);

        logger.info(`${req.user.username} deleted ${resp.count} files`, {
          user: req.user.id,
          owners: toDeleteFiles.map((f) => f.userId),
        });

        return res.send(resp);
      },
    );
  },
  { name: PATH },
);
