import { createAccessToken } from '@/lib/accessToken';
import { ApiError } from '@/lib/api/errors';
import { verifyPassword } from '@/lib/crypto';
import { db } from '@/lib/db';
import {
  listFileRequests,
  publicFileRequestSchema,
  type PublicFileRequest,
} from '@/lib/db/models/fileRequest';
import { secondlyRatelimit } from '@/lib/ratelimits';
import typedPlugin from '@/server/typedPlugin';
import { z } from 'zod';

export type ApiFileRequestResponse = (PublicFileRequest & { open: boolean }) | { token: string };

const paramsSchema = z.object({ id: z.string() });
export const PATH = '/api/file-request/:id';

export default typedPlugin(
  async (server) => {
    server.get(
      PATH,
      {
        schema: {
          description: 'Get the public details and limits for a file request link.',
          params: paramsSchema,
          response: { 200: publicFileRequestSchema },
        },
      },
      async (req, res) => {
        const row = await db.query.fileRequests.findFirst({
          columns: { userId: true },
          where: { id: req.params.id },
        });
        if (!row) throw new ApiError(4012);

        const [request] = await listFileRequests(row.userId, req.params.id);
        if (!request) throw new ApiError(4012);

        const full =
          (request.maxFiles !== null && request.receivedFiles >= request.maxFiles) ||
          (request.maxBytes !== null && request.receivedBytes >= request.maxBytes);
        const open = request.enabled && !full && (!request.expiresAt || request.expiresAt > new Date());
        const { enabled: _enabled, folderId: _folderId, folderName: _folderName, ...publicRequest } = request;
        return res.send({ ...publicRequest, open });
      },
    );

    server.post(
      PATH,
      {
        schema: {
          description: 'Verify a file request password and return a short-lived upload token.',
          params: paramsSchema,
          body: z.object({ password: z.string().max(256) }),
          response: { 200: z.object({ token: z.string() }) },
        },
        ...secondlyRatelimit(2),
      },
      async (req, res) => {
        const request = await db.query.fileRequests.findFirst({
          columns: { id: true, enabled: true, expiresAt: true, password: true },
          where: { id: req.params.id },
        });
        if (!request) throw new ApiError(4012);
        if (!request.enabled || (request.expiresAt && request.expiresAt <= new Date()))
          throw new ApiError(1073);
        if (!request.password || !(await verifyPassword(req.body.password, request.password)))
          throw new ApiError(3005);

        return res.send({
          token: createAccessToken({ type: 'fileRequest', id: request.id, expiresIn: 2 * 60 * 60_000 }),
        });
      },
    );
  },
  { name: PATH },
);
