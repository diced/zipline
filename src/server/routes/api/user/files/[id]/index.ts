import { bytes } from '@/lib/bytes';
import { hashPassword } from '@/lib/crypto';
import { datasource } from '@/lib/datasource';
import { prisma } from '@/lib/db';
import { File, fileSelect } from '@/lib/db/models/file';
import { log } from '@/lib/logger';
import { userMiddleware } from '@/server/middleware/user';
import fastifyPlugin from 'fastify-plugin';

export type ApiUserFilesIdResponse = File;

type Body = {
  favorite?: boolean;
  maxViews?: number;
  password?: string | null;
  originalName?: string;
  type?: string;
  tags?: string[];
};

type Params = {
  id: string;
};

const logger = log('api').c('user').c('files').c('[id]');

export const PATH = '/api/user/files/:id';
export default fastifyPlugin(
  (server, _, done) => {
    server.route<{
      Body: Body;
      Params: Params;
    }>({
      url: PATH,
      method: ['GET', 'PATCH', 'DELETE'],
      preHandler: [userMiddleware],
      handler: async (req, res) => {
        const file = await prisma.file.findFirst({
          where: {
            OR: [{ id: req.params.id }, { name: req.params.id }],
          },
          select: fileSelect,
        });
        if (!file) return res.notFound();

        if (req.method === 'PATCH') {
          if (req.body.maxViews !== undefined && req.body.maxViews < 0)
            return res.badRequest('maxViews must be >= 0');

          let password: string | null | undefined = undefined;
          if (req.body.password !== undefined) {
            if (req.body.password === null) {
              password = null;
            } else if (typeof req.body.password === 'string') {
              password = await hashPassword(req.body.password);
            } else {
              return res.badRequest('password must be a string');
            }
          }

          if (req.body.tags !== undefined) {
            const tags = await prisma.tag.findMany({
              where: {
                userId: req.user.id,
                id: {
                  in: req.body.tags,
                },
              },
            });

            if (tags.length !== req.body.tags.length) return res.badRequest('invalid tag somewhere');
          }

          const newFile = await prisma.file.update({
            where: {
              id: req.params.id,
            },
            data: {
              ...(req.body.favorite !== undefined && { favorite: req.body.favorite }),
              ...(req.body.maxViews !== undefined && { maxViews: req.body.maxViews }),
              ...(req.body.originalName !== undefined && { originalName: req.body.originalName }),
              ...(req.body.type !== undefined && { type: req.body.type }),
              ...(password !== undefined && { password }),
              ...(req.body.tags !== undefined && {
                tags: {
                  set: req.body.tags.map((tag) => ({ id: tag })),
                },
              }),
            },
            select: fileSelect,
          });

          logger.info(`${req.user.username} updated file ${newFile.name}`, { favorite: newFile.favorite });

          return res.send(newFile);
        } else if (req.method === 'DELETE') {
          const deletedFile = await prisma.file.delete({
            where: {
              id: req.params.id,
            },
            select: fileSelect,
          });

          await datasource.delete(deletedFile.name);

          logger.info(`${req.user.username} deleted file ${deletedFile.name}`, {
            size: bytes(deletedFile.size),
          });

          return res.send(deletedFile);
        }

        return res.send(file);
      },
    });

    done();
  },
  { name: PATH },
);
