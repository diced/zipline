import {
  deleteIncompleteFilesByIds,
  IncompleteFile,
  incompleteFileSchema,
  listIncompleteFilesForUser,
  listOwnedIncompleteFiles,
} from '@/lib/db/models/incompleteFile';
import { log } from '@/lib/logger';
import { secondlyRatelimit } from '@/lib/ratelimits';
import { userMiddleware } from '@/server/middleware/user';
import typedPlugin from '@/server/typedPlugin';
import z from 'zod';

export type ApiUserFilesIncompleteResponse = IncompleteFile[] | { count: number };

const logger = log('api').c('user').c('files').c('incomplete');

export const PATH = '/api/user/files/incomplete';
export default typedPlugin(
  async (server) => {
    server.get(
      PATH,
      {
        schema: {
          description: 'List incomplete or still-processing file uploads for the authenticated user.',
          response: {
            200: z.array(incompleteFileSchema),
          },
          tags: ['auth'],
        },
        preHandler: [userMiddleware],
      },
      async (req, res) => {
        const incompleteFiles = await listIncompleteFilesForUser(req.user.id);

        return res.send(incompleteFiles);
      },
    );

    server.delete(
      PATH,
      {
        schema: {
          description: 'Delete one or more incomplete file records owned by the authenticated user.',
          body: z.object({
            id: z.array(z.string()),
          }),
          response: {
            200: z.object({
              count: z.number(),
            }),
          },
          tags: ['auth'],
        },
        preHandler: [userMiddleware],
        ...secondlyRatelimit(1),
      },
      async (req, res) => {
        const existingFiles = await listOwnedIncompleteFiles(req.body.id, req.user.id);
        const count = await deleteIncompleteFilesByIds(existingFiles.map((file) => file.id));
        const incompleteFiles = { count };

        logger.info('incomplete files deleted', {
          count: incompleteFiles.count,
          user: req.user.username,
        });

        return res.send(incompleteFiles);
      },
    );
  },
  { name: PATH },
);
