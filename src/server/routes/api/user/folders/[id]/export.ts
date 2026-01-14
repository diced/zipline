import { datasource } from '@/lib/datasource';
import { prisma } from '@/lib/db';
import { log } from '@/lib/logger';
import { userMiddleware } from '@/server/middleware/user';
import typedPlugin from '@/server/typedPlugin';
import archiver from 'archiver';
import z from 'zod';

export type ApiUserFoldersIdExportResponse = null;

const logger = log('api').c('user').c('folders').c('[id]').c('export');

export const PATH = '/api/user/folders/:id/export';
export default typedPlugin(
  async (server) => {
    server.get(
      PATH,
      { schema: { params: z.object({ id: z.string() }) }, preHandler: [userMiddleware] },
      async (req, res) => {
        const { id } = req.params;

        const folder = await prisma.folder.findUnique({
          where: {
            id,
          },
          include: {
            files: true,
          },
        });
        if (!folder) return res.notFound('Folder not found');
        if (req.user.id !== folder.userId) return res.forbidden('You do not own this folder');

        if (!folder.files.length) return res.badRequest("Can't export an empty folder.");

        logger.info(`folder export requested: ${folder.name}`, { user: req.user.id, folder: folder.id });

        res.hijack();

        res.raw.setHeader('Content-Type', 'application/zip');
        res.raw.setHeader('Content-Disposition', `attachment; filename="${folder.name}.zip"`);

        const zip = archiver('zip', {
          zlib: { level: 9 },
        });

        zip.pipe(res.raw);

        for (const file of folder.files) {
          const stream = await datasource.get(file.name);
          if (!stream) {
            logger.warn('failed to get file stream for folder export', { file: file.id, folder: folder.id });
            continue;
          }

          zip.append(stream, { name: file.name });
        }

        zip.on('error', (err) => {
          logger.error('error during folder export zip creation', { folder: folder.id }).error(err as Error);
        });

        zip.on('finish', () => {
          logger.info(`folder export completed: ${folder.name}`, { user: req.user.id, folder: folder.id });
        });

        await zip.finalize();
      },
    );
  },
  { name: PATH },
);
