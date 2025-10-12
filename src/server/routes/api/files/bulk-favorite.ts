import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { userMiddleware } from '@/server/middleware/user';
import fastifyPlugin from 'fastify-plugin';

export const PATH = '/api/files/bulk-favorite';

const bulkFavoriteSchema = z.object({
  fileIds: z.array(z.string()).min(1),
});

interface BulkFavoriteRequest {
  Body: z.infer<typeof bulkFavoriteSchema>;
}

export default fastifyPlugin((server: FastifyInstance, _, done) => {
  server.route<BulkFavoriteRequest>({
    url: PATH,
    method: 'POST',
    preHandler: [userMiddleware],
    handler: async (request: FastifyRequest<BulkFavoriteRequest>, reply: FastifyReply) => {
      try {
        const { fileIds } = bulkFavoriteSchema.parse(request.body);
        const userId = request.user.id;

        const userFiles = await prisma.file.findMany({
          where: {
            id: { in: fileIds },
            userId: userId,
          },
        });

        if (userFiles.length !== fileIds.length) {
          return reply.code(403).send({
            error: 'Unauthorized to favorite some files',
          });
        }

        await prisma.file.updateMany({
          where: {
            id: { in: fileIds },
            userId: userId,
          },
          data: {
            favorite: true,
          },
        });

        return reply.send({
          success: true,
          favoritedCount: fileIds.length,
        });
      } catch (error) {
        server.log.error(error);
        return reply.code(500).send({
          error: 'Failed to favorite files',
        });
      }
    },
  });

  done();
});
