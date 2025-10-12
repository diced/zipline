import { prisma } from '@/lib/db';
import { userMiddleware } from '@/server/middleware/user';
import fastifyPlugin from 'fastify-plugin';

type Params = {
  id: string;
};

export const PATH = '/api/folders/:id/delete';
export default fastifyPlugin((server, _, done) => {
  server.delete<{ Params: Params }>(PATH, { preHandler: [userMiddleware] }, async (req, res) => {
    const { id } = req.params;

    const folder = await prisma.folder.findFirst({
      where: {
        id,
        userId: req.user.id,
      },
      include: {
        _count: {
          select: {
            files: true,
          },
        },
      },
    });

    if (!folder) {
      return res.status(404).send({ error: 'Folder not found or does not belong to you' });
    }

    if (folder._count.files > 0) {
      await prisma.file.updateMany({
        where: {
          folderId: id,
        },
        data: {
          folderId: null,
        },
      });
    }

    await prisma.folder.delete({
      where: {
        id,
      },
    });

    return {
      success: true,
      message: `Folder deleted and ${folder._count.files} files moved to root`,
      filesMovedToRoot: folder._count.files,
    };
  });

  done();
});
