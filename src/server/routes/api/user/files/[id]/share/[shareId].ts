import { ApiError } from '@/lib/api/errors';
import { prisma } from '@/lib/db';
import { log } from '@/lib/logger';
import { canInteract } from '@/lib/role';
import { userMiddleware } from '@/server/middleware/user';
import typedPlugin from '@/server/typedPlugin';
import z from 'zod';

const logger = log('api').c('user').c('files').c('[id]').c('share');

export const PATH = '/api/user/files/:id/share/:shareId';
export default typedPlugin(
  async (server) => {
    server.delete(
      PATH,
      {
        schema: {
          description: 'Revoke a share link for a file owned by the authenticated user.',
          params: z.object({ id: z.string(), shareId: z.string() }),
          response: {
            200: z.object({ success: z.boolean() }),
          },
          tags: ['auth'],
        },
        preHandler: [userMiddleware],
      },
      async (req, res) => {
        const file = await prisma.file.findFirst({
          where: { OR: [{ id: req.params.id }, { name: req.params.id }] },
          include: { User: true },
        });
        if (!file) throw new ApiError(4000);
        if (file.userId !== req.user.id && !canInteract(req.user.role, file.User?.role ?? 'USER'))
          throw new ApiError(4000);

        const share = await prisma.fileShare.findFirst({
          where: { id: req.params.shareId, fileId: file.id },
        });
        if (!share) throw new ApiError(4000);

        await prisma.fileShare.delete({ where: { id: share.id } });

        logger.info(`${req.user.username} revoked share ${share.id} for file ${file.name}`, {
          file: file.id,
        });

        return res.send({ success: true });
      },
    );
  },
  { name: PATH },
);
