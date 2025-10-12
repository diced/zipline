import { datasource } from '@/lib/datasource';
import { prisma } from '@/lib/db';
import { log } from '@/lib/logger';
import { secondlyRatelimit } from '@/lib/ratelimits';
import { userMiddleware } from '@/server/middleware/user';
import fastifyPlugin from 'fastify-plugin';

export type ApiUserFilesTransactionResponse = {
  count: number;
  name?: string;
};

type Body = {
  files: string[];

  favorite?: boolean;

  folder?: string;

  tags?: string[];

  delete_datasourceFiles?: boolean;
};

const logger = log('api').c('user').c('files').c('transaction');

export const PATH = '/api/user/files/transaction';
export default fastifyPlugin(
  (server, _, done) => {
    server.route<{
      Body: Body;
    }>({
      url: PATH,
      method: ['PATCH', 'DELETE'],
      preHandler: [userMiddleware],
      ...secondlyRatelimit(2),
      handler: async (req, res) => {
        const { files, favorite, folder, tags } = req.body;

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

          return res.send(resp);
        }

        if (typeof favorite === 'boolean') {
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

          logger.info(`${req.user.username} ${favorite ? 'favorited' : 'unfavorited'} ${resp.count} files`, {
            user: req.user.id,
          });

          return res.send(resp);
        }

        if (tags && tags.length > 0) {
          if (!Array.isArray(tags)) {
            return res.badRequest('tags must be an array');
          }

          if (!tags.every((tagId) => typeof tagId === 'string')) {
            return res.badRequest('all tag IDs must be strings');
          }

          const userTags = await prisma.tag.findMany({
            where: {
              userId: req.user.id,
              id: {
                in: tags,
              },
            },
          });

          if (userTags.length !== tags.length) {
            return res.badRequest('invalid tag somewhere');
          }

          const updatedFiles = await Promise.all(
            files.map(async (fileId) => {
              const currentFile = await prisma.file.findUnique({
                where: { id: fileId },
                select: {
                  id: true,
                  tags: { select: { id: true } },
                },
              });

              if (!currentFile) return null;

              const currentTagIds = currentFile.tags.map((tag) => tag.id);
              const allTagIds = [...new Set([...currentTagIds, ...tags])];

              return prisma.file.update({
                where: { id: fileId },
                data: {
                  tags: {
                    set: allTagIds.map((tagId) => ({ id: tagId })),
                  },
                },
                select: { id: true },
              });
            }),
          );

          const successCount = updatedFiles.filter(Boolean).length;

          logger.info(`${req.user.username} added tags to ${successCount} files`, {
            user: req.user.id,
            tags: tags.length,
          });

          return res.send({ count: successCount });
        }

        if (folder) {
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

          return res.send({
            ...resp,
            name: f.name,
          });
        }

        return res.badRequest("can't PATCH without an action");
      },
    });

    done();
  },
  { name: PATH },
);
