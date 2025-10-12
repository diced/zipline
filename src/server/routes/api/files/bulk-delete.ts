import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { userMiddleware } from '@/server/middleware/user';
import fastifyPlugin from 'fastify-plugin';

export const PATH = '/api/files/bulk-delete';

const bulkDeleteSchema = z.object({
  fileIds: z.array(z.string()).min(1),
});

interface BulkDeleteRequest {
  Body: z.infer<typeof bulkDeleteSchema>;
}

export default fastifyPlugin((server: FastifyInstance, _, done) => {
  server.route<BulkDeleteRequest>({
    url: PATH,
    method: 'POST',
    preHandler: [userMiddleware],
    handler: async (request: FastifyRequest<BulkDeleteRequest>, reply: FastifyReply) => {
      try {
        const { fileIds } = bulkDeleteSchema.parse(request.body);
        const userId = request.user.id;

        const userFiles = await prisma.file.findMany({
          where: {
            id: { in: fileIds },
            userId: userId,
          },
        });

        if (userFiles.length !== fileIds.length) {
          return reply.code(403).send({
            error: 'Unauthorized to delete some files',
          });
        }

        await prisma.file.deleteMany({
          where: {
            id: { in: fileIds },
            userId: userId,
          },
        });

        return reply.send({
          success: true,
          deletedCount: fileIds.length,
        });
      } catch (error) {
        server.log.error(error);
        return reply.code(500).send({
          error: 'Failed to delete files',
        });
      }
    },
  });

  done();
});
