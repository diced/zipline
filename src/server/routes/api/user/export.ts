import { config } from '@/lib/config';
import { datasource } from '@/lib/datasource';
import { prisma } from '@/lib/db';
import { log } from '@/lib/logger';
import { userMiddleware } from '@/server/middleware/user';
import { Export } from '@prisma/client';
import fastifyPlugin from 'fastify-plugin';
import { Zip, ZipPassThrough } from 'fflate';
import { createWriteStream } from 'fs';
import { rm, stat } from 'fs/promises';
import { join } from 'path';

export type ApiUserExportResponse = {
  running?: boolean;
  deleted?: boolean;
} & Export[];

type Query = {
  id?: string;
};

export const PATH = '/api/user/export';

const logger = log('api').c('user').c('export');

export default fastifyPlugin(
  (server, _, done) => {
    server.get<{ Querystring: Query }>(PATH, { preHandler: [userMiddleware] }, async (req, res) => {
      const exports = await prisma.export.findMany({
        where: { userId: req.user.id },
      });

      if (req.query.id) {
        const file = exports.find((x) => x.id === req.query.id);
        if (!file) return res.notFound();

        if (!file.completed) return res.badRequest('Export is not completed');

        const path = join(config.core.tempDirectory, file.path);
        return res.sendFile(path);
      }

      return res.send(exports);
    });

    server.delete<{ Querystring: Query }>(PATH, { preHandler: [userMiddleware] }, async (req, res) => {
      if (!req.query.id) return res.badRequest('No id provided');

      const exportDb = await prisma.export.findFirst({
        where: {
          userId: req.user.id,
          id: req.query.id,
        },
      });
      if (!exportDb) return res.notFound();

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
    });

    server.post(PATH, { preHandler: [userMiddleware] }, async (req, res) => {
      const files = await prisma.file.findMany({
        where: { userId: req.user.id },
      });

      if (!files.length) return res.badRequest('No files to export');

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
      const zip = new Zip();

      const onBackpressure = (stream: any, outputStream: any, cb: any) => {
        const runCb = () => {
          cb(applyOutputBackpressure || backpressureBytes > backpressureThreshold);
        };

        const backpressureThreshold = 65536;
        const backpressure: number[] = [];
        let backpressureBytes = 0;
        const push = stream.push;
        stream.push = (data: string | any[], final: any) => {
          backpressure.push(data.length);
          backpressureBytes += data.length;
          runCb();
          push.call(stream, data, final);
        };
        let ondata = stream.ondata;
        const ondataPatched = (err: any, data: any, final: any) => {
          ondata.call(stream, err, data, final);
          backpressureBytes -= backpressure.shift()!;
          runCb();
        };
        if (ondata) {
          stream.ondata = ondataPatched;
        } else {
          Object.defineProperty(stream, 'ondata', {
            get: () => ondataPatched,
            set: (cb) => (ondata = cb),
          });
        }

        let applyOutputBackpressure = false;
        const write = outputStream.write;
        outputStream.write = (data: any) => {
          const outputNotFull = write.call(outputStream, data);
          applyOutputBackpressure = !outputNotFull;
          runCb();
        };
        outputStream.on('drain', () => {
          applyOutputBackpressure = false;
          runCb();
        });
      };

      zip.ondata = async (err, data, final) => {
        if (err) {
          writeStream.close();
          logger.debug('error while writing to zip', { err });
          logger.error(`export for ${req.user.id} failed`);

          await prisma.export.delete({ where: { id: exportDb.id } });

          return;
        }

        writeStream.write(data);

        if (!final) return;

        writeStream.end();
        logger.debug('exported', { path: exportPath, bytes: data.length });
        logger.info(`export for ${req.user.id} finished at ${exportPath}`);

        await prisma.export.update({
          where: { id: exportDb.id },
          data: {
            completed: true,
            size: (await stat(exportPath)).size.toString(),
          },
        });
      };

      for (let i = 0; i !== files.length; ++i) {
        const file = files[i];

        const stream = await datasource.get(file.name);
        if (!stream) {
          logger.warn(`failed to get file ${file.name}`);
          continue;
        }

        const passThrough = new ZipPassThrough(file.name);
        zip.add(passThrough);

        onBackpressure(passThrough, stream, (applyBackpressure: boolean) => {
          if (applyBackpressure) {
            stream.pause();
          } else if (stream.isPaused()) {
            stream.resume();
          }
        });
        stream.on('data', (c) => passThrough.push(c));
        stream.on('end', () => {
          passThrough.push(new Uint8Array(0), true);
          logger.debug(`file ${i + 1}/${files.length} added to zip`, { name: file.name });
        });
      }

      zip.end();

      return res.send({ running: true });
    });

    done();
  },
  { name: PATH },
);
