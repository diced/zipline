import { prisma } from '@/lib/db';
import { Url } from '@/lib/db/models/url';
import { userMiddleware } from '@/server/middleware/user';
import fastifyPlugin from 'fastify-plugin';

export type ApiUserUrlsIdResponse = Url;

type Params = {
  id: string;
};

export const PATH = '/api/user/urls/:id';
export default fastifyPlugin(
  (server, _, done) => {
    server.get<{ Params: Params }>(PATH, { preHandler: [userMiddleware] }, async (req, res) => {
      const { id } = req.params;

      const url = await prisma.url.findFirst({
        where: {
          id: id,
        },
      });

      if (!url) return res.notFound();
      if (url.userId !== req.user.id) return res.forbidden("You don't own this URL");

      return res.send(url);
    });

    server.delete<{ Params: Params }>(PATH, { preHandler: [userMiddleware] }, async (req, res) => {
      const { id } = req.params;

      const url = await prisma.url.findFirst({
        where: {
          id: id,
        },
      });

      if (!url) return res.notFound();
      if (url.userId !== req.user.id) return res.forbidden("You don't own this URL");

      const deletedUrl = await prisma.url.delete({
        where: {
          id: id,
        },
      });

      return res.send(deletedUrl);
    });

    done();
  },
  { name: PATH },
);
