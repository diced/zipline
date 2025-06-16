import { prisma } from '@/lib/db';
import { userMiddleware } from '@/server/middleware/user';
import fastifyPlugin from 'fastify-plugin';

export const PATH = '/api/user/folders';
export default fastifyPlugin((server, _, done) => {
  server.get(PATH, { preHandler: [userMiddleware] }, async (req, res) => {
    const folders = await prisma.folder.findMany({
      where: {
        userId: req.user.id,
      },
      select: {
        id: true,
        name: true,
        createdAt: true,
        public: true,
        allowUploads: true,
        _count: {
          select: {
            files: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    return folders;
  });

  done();
});
