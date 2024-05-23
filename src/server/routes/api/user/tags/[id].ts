import { prisma } from '@/lib/db';
import { Tag, tagSelect } from '@/lib/db/models/tag';
import { userMiddleware } from '@/server/middleware/user';
import fastifyPlugin from 'fastify-plugin';

export type ApiUserTagsIdResponse = Tag;

type Body = {
  name?: string;
  color?: string;
};

type Params = {
  id: string;
};

export const PATH = '/api/user/tags/:id';
export default fastifyPlugin(
  (server, _, done) => {
    server.route<{
      Params: Params;
      Body: Body;
    }>({
      url: PATH,
      method: ['GET', 'DELETE', 'PATCH'],
      preHandler: [userMiddleware],
      handler: async (req, res) => {
        const { id } = req.params;

        const tag = await prisma.tag.findFirst({
          where: {
            userId: req.user.id,
            id,
          },
          select: tagSelect,
        });
        if (!tag) return res.notFound();

        if (req.method === 'DELETE') {
          const tag = await prisma.tag.delete({
            where: {
              id,
            },
            select: tagSelect,
          });

          return res.send(tag);
        }

        if (req.method === 'PATCH') {
          const { name, color } = req.body;

          if (name) {
            const existing = await prisma.tag.findFirst({
              where: {
                name,
              },
            });

            if (existing) return res.badRequest('tag name already exists');
          }

          const tag = await prisma.tag.update({
            where: {
              id,
            },
            data: {
              ...(name && { name }),
              ...(color && { color }),
            },
            select: tagSelect,
          });

          return res.send(tag);
        }

        return res.send(tag);
      },
    });

    done();
  },
  { name: PATH },
);
