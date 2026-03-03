import { ApiError } from '@/lib/api/errors';
import { bytes } from '@/lib/bytes';
import { config } from '@/lib/config';
import { datasource } from '@/lib/datasource';
import { prisma } from '@/lib/db';
import { exportSchema } from '@/lib/db/models/export';
import { log } from '@/lib/logger';
import { secondlyRatelimit } from '@/lib/ratelimits';
import { Export } from '@/prisma/client';
import { userMiddleware } from '@/server/middleware/user';
import typedPlugin from '@/server/typedPlugin';
import archiver from 'archiver';
import { createWriteStream } from 'fs';
import { rm, stat } from 'fs/promises';
import { join } from 'path';
import z from 'zod';

export type ApiUserExportResponse = {
  running?: boolean;
  deleted?: boolean;
} & Export[];

export const PATH = '/api/user/export';

const querySchema = z.object({
  id: z.string().optional(),
});

const logger = log('api').c('user').c('export');

export default typedPlugin(
  async (server) => {
    server.get(
      PATH,
      {
        schema: {
          description: 'List your exports or download a specific completed export archive by ID.',
          querystring: querySchema,
          response: {
            200: z.array(exportSchema),
          },
          produces: ['application/json', 'application/zip'],
        },
        preHandler: [userMiddleware],
      },
      async (req, res) => {
        const exports = await prisma.export.findMany({
          where: { userId: req.user.id },
        });

        if (req.query.id) {
          const file = exports.find((x) => x.id === req.query.id);
          if (!file) throw new ApiError(9002);

          if (!file.completed) throw new ApiError(1024);

          return res.sendFile(file.path);
        }

        return res.send(exports);
      },
    );

    server.delete(
      PATH,
      {
        schema: {
          description: 'Delete a specific export and remove its archive file from storage.',
          querystring: querySchema,
          response: {
            200: z.object({
              deleted: z.boolean(),
            }),
          },
        },
        preHandler: [userMiddleware],
      },
      async (req, res) => {
        if (!req.query.id) throw new ApiError(1029);

        const exportDb = await prisma.export.findFirst({
          where: {
            userId: req.user.id,
            id: req.query.id,
          },
        });
        if (!exportDb) throw new ApiError(9002);

        const path = join(config.core.tempDirectory, exportDb.path);

        try {
          await rm(path);
        } catch (e) {
          logger.warn(
            `failed to delete export file, it might already be deleted. ${exportDb.id}: ${exportDb.path}`,
            { e },
          );
        }

        await prisma.export.delete({ where: { id: req.query.id } });

        logger.info(`deleted export ${exportDb.id}: ${exportDb.path}`);

        return res.send({ deleted: true });
      },
    );

    server.post(
      PATH,
      {
        schema: {
          description: 'Start an export job that zips all of your files into a downloadable archive.',
          response: {
            200: z.object({
              running: z.boolean(),
            }),
          },
        },
        preHandler: [userMiddleware],
        ...secondlyRatelimit(5),
      },
      async (req, res) => {
        const files = await prisma.file.findMany({
          where: { userId: req.user.id },
        });

        if (!files.length) throw new ApiError(1025);

        const exportFileName = `zexport_${req.user.id}_${Date.now()}_${files.length}.zip`;
        const exportPath = join(config.core.tempDirectory, exportFileName);

        logger.debug(`exporting ${req.user.id}`, { exportPath, files: files.length });

        const exportDb = await prisma.export.create({
          data: {
            userId: req.user.id,
            path: exportFileName,
            files: files.length,
            size: '0',
          },
        });
        const writeStream = createWriteStream(exportPath);

        const zip = archiver('zip', {
          zlib: { level: 9 },
        });

        zip.pipe(writeStream);

        let totalSize = 0;
        for (const file of files) {
          const stream = await datasource.get(file.name);
          if (!stream) {
            logger.warn(`failed to get file ${file.name}`);
            continue;
          }

          zip.append(stream, { name: file.name });
          totalSize += file.size;
          logger.debug('file added to zip', { name: file.name, size: file.size });
        }

        writeStream.on('close', async () => {
          logger.debug('exported', { path: exportPath, bytes: zip.pointer() });
          logger.info(`export for ${req.user.id} finished at ${exportPath}`);

          await prisma.export.update({
            where: { id: exportDb.id },
            data: {
              completed: true,
              size: (await stat(exportPath)).size.toString(),
            },
          });
        });

        zip.on('error', (err) => {
          logger.error('export zip error', { err, exportId: exportDb.id });
        });

        zip.finalize();

        logger.info(`export for ${req.user.id} started`, { totalSize: bytes(totalSize) });

        return res.send({ running: true });
      },
    );
  },
  { name: PATH },
);
