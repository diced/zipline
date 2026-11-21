import { ApiError } from '@/lib/api/errors';
import { hashPassword } from '@/lib/crypto';
import { db } from '@/lib/db';
import {
  fileRequestSchema,
  listFileRequests,
  normalizeAllowedTypes,
  type FileRequest,
} from '@/lib/db/models/fileRequest';
import { getFolderMetadata } from '@/lib/db/models/folder';
import { fileRequests } from '@/lib/db/schema';
import { log } from '@/lib/logger';
import { zStringTrimmed } from '@/lib/validation';
import { userMiddleware } from '@/server/middleware/user';
import typedPlugin from '@/server/typedPlugin';
import { z } from 'zod';

export type ApiUserFileRequestsResponse = FileRequest[] | FileRequest;

export const fileRequestInputSchema = z.object({
  name: zStringTrimmed.min(1).max(120),
  description: z.string().trim().max(2000).nullish(),
  enabled: z.boolean().optional(),
  password: z.string().max(256).nullish(),
  expiresAt: z.coerce.date().nullish(),
  maxFiles: z.number().int().min(1).max(1000).nullish(),
  maxBytes: z.number().int().min(1).max(Number.MAX_SAFE_INTEGER).nullish(),
  allowedTypes: z
    .array(z.string().max(120))
    .max(50)
    .refine((types) => {
      const normalized = normalizeAllowedTypes(types);
      return (
        normalized.length <= 50 &&
        normalized.every(
          (type) =>
            /^[a-z0-9][a-z0-9+_-]*$/.test(type) ||
            /^[a-z0-9][a-z0-9.+-]*\/(?:\*|[a-z0-9][a-z0-9.+-]*)$/.test(type),
        )
      );
    }, 'Allowed types must be file extensions or MIME types.')
    .optional(),
  folderId: z.string().nullish(),
});

const logger = log('api').c('user').c('file-requests');
export const PATH = '/api/user/file-requests';

export default typedPlugin(
  async (server) => {
    server.get(
      PATH,
      {
        schema: {
          description: 'List file request links owned by the authenticated user.',
          response: { 200: z.array(fileRequestSchema) },
          tags: ['auth'],
        },
        preHandler: [userMiddleware],
      },
      async (req, res) => res.send(await listFileRequests(req.user.id)),
    );

    server.post(
      PATH,
      {
        schema: {
          description: 'Create an upload-only file request link.',
          body: fileRequestInputSchema,
          response: { 200: fileRequestSchema },
          tags: ['auth'],
        },
        preHandler: [userMiddleware],
      },
      async (req, res) => {
        if (req.body.expiresAt && req.body.expiresAt <= new Date())
          throw new ApiError(1000, 'Expiration must be in the future.');

        if (req.body.folderId) {
          const folder = await getFolderMetadata(req.body.folderId);
          if (!folder || folder.userId !== req.user.id) throw new ApiError(4001);
        }

        const [created] = await db
          .insert(fileRequests)
          .values({
            userId: req.user.id,
            name: req.body.name,
            description: req.body.description || null,
            enabled: req.body.enabled ?? true,
            password: req.body.password ? await hashPassword(req.body.password) : null,
            expiresAt: req.body.expiresAt,
            maxFiles: req.body.maxFiles,
            maxBytes: req.body.maxBytes,
            allowedTypes: normalizeAllowedTypes(req.body.allowedTypes ?? []),
            folderId: req.body.folderId,
          })
          .returning({ id: fileRequests.id });
        if (!created) throw new ApiError(9005);

        const [request] = await listFileRequests(req.user.id, created.id);
        if (!request) throw new ApiError(9005);

        logger.info('file request created', { user: req.user.id, fileRequest: request.id });
        return res.send(request);
      },
    );
  },
  { name: PATH },
);
