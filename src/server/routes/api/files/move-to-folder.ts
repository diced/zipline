import { prisma } from '@/lib/db';
import { userMiddleware } from '@/server/middleware/user';
import { FastifyRequest } from 'fastify';
import fastifyPlugin from 'fastify-plugin';
import { z } from 'zod';

const schema = z.object({
  fileIds: z.array(z.string()),
  folderId: z.string().nullable(),
});

type Body = z.infer<typeof schema>;

export const PATH = '/api/files/move-to-folder';
export default fastifyPlugin((server, _, done) => {
  server.post<{ Body: Body }>(PATH, { preHandler: [userMiddleware] }, async (req, res) => {
    const { fileIds, folderId } = req.body;

    // Verify that all files belong to the current user
    const files = await prisma.file.findMany({
      where: {
        id: { in: fileIds },
        userId: req.user.id,
      },
      select: { id: true },
    });

    if (files.length !== fileIds.length) {
      return res.status(404).send({ error: 'Some files do not exist or do not belong to you' });
    }

    // If folderId is provided, verify that the folder belongs to the current user
    if (folderId) {
      const folder = await prisma.folder.findFirst({
        where: {
          id: folderId,
          userId: req.user.id,
        },
      });

      if (!folder) {
        return res.status(404).send({ error: 'Folder does not exist or does not belong to you' });
      }
    }

    // Update all files
    await prisma.file.updateMany({
      where: {
        id: { in: fileIds },
        userId: req.user.id,
      },
      data: {
        folderId: folderId,
      },
    });

    return {
      success: true,
      moved: fileIds.length,
      folderId,
    };
  });

  done();
});
