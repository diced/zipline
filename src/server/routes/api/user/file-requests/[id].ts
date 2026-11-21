import { ApiError } from '@/lib/api/errors';
import { hashPassword } from '@/lib/crypto';
import { db } from '@/lib/db';
import { fileRequestSchema, listFileRequests, normalizeAllowedTypes } from '@/lib/db/models/fileRequest';
import { getFolderMetadata } from '@/lib/db/models/folder';
import { fileRequests } from '@/lib/db/schema';
import { log } from '@/lib/logger';
import { userMiddleware } from '@/server/middleware/user';
import typedPlugin from '@/server/typedPlugin';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { fileRequestInputSchema } from '.';

const logger = log('api').c('user').c('file-requests').c('[id]');
const paramsSchema = z.object({ id: z.string() });
export const PATH = '/api/user/file-requests/:id';

export default typedPlugin(
  async (server) => {
    server.patch(
      PATH,
      {
        schema: {
          description: 'Update a file request link owned by the authenticated user.',
          params: paramsSchema,
          body: fileRequestInputSchema.partial(),
          response: { 200: fileRequestSchema },
          tags: ['auth'],
        },
        preHandler: [userMiddleware],
      },
      async (req, res) => {
        if (req.body.folderId) {
          const folder = await getFolderMetadata(req.body.folderId);
          if (!folder || folder.userId !== req.user.id) throw new ApiError(4001);
        }

        const update: Partial<typeof fileRequests.$inferInsert> = {};
        if (req.body.name !== undefined) update.name = req.body.name;
        if (req.body.description !== undefined) update.description = req.body.description || null;
        if (req.body.enabled !== undefined) update.enabled = req.body.enabled;
        if (req.body.expiresAt !== undefined) update.expiresAt = req.body.expiresAt;
        if (req.body.maxFiles !== undefined) update.maxFiles = req.body.maxFiles;
        if (req.body.maxBytes !== undefined) update.maxBytes = req.body.maxBytes;
        if (req.body.folderId !== undefined) update.folderId = req.body.folderId;
        if (req.body.allowedTypes !== undefined)
          update.allowedTypes = normalizeAllowedTypes(req.body.allowedTypes);
        if (req.body.password !== undefined)
          update.password = req.body.password ? await hashPassword(req.body.password) : null;

        const [updated] = await db
          .update(fileRequests)
          .set(update)
          .where(and(eq(fileRequests.id, req.params.id), eq(fileRequests.userId, req.user.id)))
          .returning({ id: fileRequests.id });
        if (!updated) throw new ApiError(4012);

        const [request] = await listFileRequests(req.user.id, updated.id);
        if (!request) throw new ApiError(4012);

        logger.info('file request updated', { user: req.user.id, fileRequest: request.id });
        return res.send(request);
      },
    );

    server.delete(
      PATH,
      {
        schema: {
          description: 'Delete a file request link without deleting received files.',
          params: paramsSchema,
          response: { 200: z.object({ success: z.literal(true) }) },
          tags: ['auth'],
        },
        preHandler: [userMiddleware],
      },
      async (req, res) => {
        const [deleted] = await db
          .delete(fileRequests)
          .where(and(eq(fileRequests.id, req.params.id), eq(fileRequests.userId, req.user.id)))
          .returning({ id: fileRequests.id });
        if (!deleted) throw new ApiError(4012);

        logger.info('file request deleted', { user: req.user.id, fileRequest: deleted.id });
        return res.send({ success: true as const });
      },
    );
  },
  { name: PATH },
);
