import { ApiError } from '@/lib/api/errors';
import { bytes } from '@/lib/bytes';
import { config } from '@/lib/config';
import { datasource } from '@/lib/datasource';
import { db } from '@/lib/db';
import { Export, exportSchema } from '@/lib/db/models/export';
import { exports, files } from '@/lib/db/schema';
import { log } from '@/lib/logger';
import { secondlyRatelimit } from '@/lib/ratelimits';
import { userMiddleware } from '@/server/middleware/user';
import typedPlugin from '@/server/typedPlugin';
import archiver from 'archiver';
import { and, eq } from 'drizzle-orm';
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
          tags: ['auth'],
        },
        preHandler: [userMiddleware],
      },
      async (req, res) => {
        if (req.query.id) {
          const [file] = await db
            .select()
            .from(exports)
            .where(and(eq(exports.id, req.query.id), eq(exports.userId, req.user.id)))
            .limit(1);

          if (!file) throw new ApiError(9002);
          if (!file.completed) throw new ApiError(1024);

          return res.sendFile(file.path);
        }

        const exportList = await db
          .select({
            id: exports.id,
            createdAt: exports.createdAt,
            updatedAt: exports.updatedAt,
            completed: exports.completed,
            files: exports.files,
            size: exports.size,
            path: exports.path,
          })
          .from(exports)
          .where(eq(exports.userId, req.user.id));

        return res.send(exportList);
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
          tags: ['auth'],
        },
        preHandler: [userMiddleware],
      },
      async (req, res) => {
        if (!req.query.id) throw new ApiError(1029);

        const [exportDb] = await db
          .select({ id: exports.id, path: exports.path })
          .from(exports)
          .where(and(eq(exports.id, req.query.id), eq(exports.userId, req.user.id)))
          .limit(1);

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

        const [deleted] = await db
          .delete(exports)
          .where(and(eq(exports.id, req.query.id), eq(exports.userId, req.user.id)))
          .returning({ id: exports.id });
        if (!deleted) throw new ApiError(9002);

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
          tags: ['auth'],
        },
        preHandler: [userMiddleware],
        ...secondlyRatelimit(5),
      },
      async (req, res) => {
        const rows = await db
          .select({ name: files.name, size: files.size })
          .from(files)
          .where(eq(files.userId, req.user.id));

        if (!rows.length) throw new ApiError(1025);

        const exportFileName = `zexport_${req.user.id}_${Date.now()}_${rows.length}.zip`;
        const exportPath = join(config.core.tempDirectory, exportFileName);

        logger.debug(`exporting ${req.user.id}`, { exportPath, files: rows.length });

        const [exportDb] = await db
          .insert(exports)
          .values({
            userId: req.user.id,
            path: exportFileName,
            files: rows.length,
            size: '0',
          })
          .returning({ id: exports.id });
        if (!exportDb) throw new ApiError(9005);

        const writeStream = createWriteStream(exportPath);

        const zip = archiver('zip', {
          zlib: { level: 9 },
        });

        zip.pipe(writeStream);

        let totalSize = 0;
        for (const file of rows) {
          const stream = await datasource.get(file.name);
          if (!stream) {
            logger.warn(`failed to get file ${file.name}`);
            continue;
          }

          zip.append(stream, { name: file.name });
          totalSize += file.size;
          logger.debug('file added to zip', { name: file.name, size: file.size });
        }

        async function completeExport() {
          logger.debug('exported', { path: exportPath, bytes: zip.pointer() });
          logger.info(`export for ${req.user.id} finished at ${exportPath}`);

          const exportStats = await stat(exportPath);
          const [completed] = await db
            .update(exports)
            .set({ completed: true, size: exportStats.size.toString() })
            .where(eq(exports.id, exportDb.id))
            .returning({ id: exports.id });
          if (!completed) throw new ApiError(9005);
        }

        writeStream.on('close', () => {
          void completeExport().catch((error) => {
            logger.error('failed to complete export', { error, exportId: exportDb.id });
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
