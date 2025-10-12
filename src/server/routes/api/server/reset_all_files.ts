import { log } from '@/lib/logger';
import { secondlyRatelimit } from '@/lib/ratelimits';
import { administratorMiddleware } from '@/server/middleware/administrator';
import { userMiddleware } from '@/server/middleware/user';
import { prisma } from '@/lib/db';
import { datasource } from '@/lib/datasource';
import { verifyPassword } from '@/lib/crypto';
import fastifyPlugin from 'fastify-plugin';
import { z } from 'zod';

export type ApiServerResetAllFilesResponse = {
  status?: string;
  deletedCount?: number;
};

const schema = z.object({
  password: z.string().min(1),
});

type Body = z.infer<typeof schema>;

const logger = log('api').c('server').c('reset_all_files');

export const PATH = '/api/server/reset_all_files';
export default fastifyPlugin(
  (server, _, done) => {
    server.delete<{ Body: Body }>(
      PATH,
      {
        preHandler: [userMiddleware, administratorMiddleware],
        ...secondlyRatelimit(1),
      },
      async (req, res) => {
        try {
          const { password } = req.body;

          const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: { password: true },
          });
          if (!user || !user.password) {
            return res.status(401).send({ error: 'Invalid credentials' });
          }

          const isPasswordValid = await verifyPassword(password, user.password);
          if (!isPasswordValid) {
            return res.status(401).send({ error: 'Invalid password' });
          }

          logger.warn('Starting reset of all files', {
            requester: req.user.username,
            userId: req.user.id,
          });
          const files = await prisma.file.findMany({
            select: {
              id: true,
              name: true,
              thumbnail: {
                select: {
                  path: true,
                },
              },
            },
          });

          let deletedCount = 0;

          for (const file of files) {
            try {
              if (file.name) {
                await datasource.delete(file.name);
              }

              if (file.thumbnail?.path) {
                await datasource.delete(file.thumbnail.path);
              }

              deletedCount++;
            } catch (fileError) {
              logger.error('Failed to delete file', {
                fileId: file.id,
                fileName: file.name,
                error: fileError,
              });
            }
          }

          await prisma.file.deleteMany({});

          await prisma.thumbnail.deleteMany({});

          await prisma.url.deleteMany({});

          const status = `Successfully deleted ${deletedCount} files and cleared all database records`;

          logger.warn('Completed reset of all files', {
            requester: req.user.username,
            deletedCount,
            totalFiles: files.length,
          });

          return res.send({
            status,
            deletedCount,
          });
        } catch (error) {
          logger.error('Failed to reset all files', {
            error,
            requester: req.user.username,
          });

          return res.status(500).send({
            error: 'Failed to reset files',
          });
        }
      },
    );

    done();
  },
  { name: PATH },
);
