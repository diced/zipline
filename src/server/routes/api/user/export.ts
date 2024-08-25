import { config } from '@/lib/config';
import { datasource } from '@/lib/datasource';
import { prisma } from '@/lib/db';
import { log } from '@/lib/logger';
import { userMiddleware } from '@/server/middleware/user';
import fastifyPlugin from 'fastify-plugin';
import { Zip, ZipPassThrough } from 'fflate';
import { createWriteStream } from 'fs';
import { readdir, rename, rm } from 'fs/promises';
import { join } from 'path';

export type ApiUserExportResponse = {
  running?: boolean;
  deleted?: boolean;
} & {
  [key in 'running' | 'complete']: {
    date: number;
    files: number;
    name: string;
  }[];
};

type Query = {
  name?: string;
};

export const PATH = '/api/user/export';

const logger = log('api').c('user').c('export');

export default fastifyPlugin(
  (server, _, done) => {
    server.get<{ Querystring: Query }>(PATH, { preHandler: [userMiddleware] }, async (req, res) => {
      const tmpFiles = await readdir(config.core.tempDirectory);
      const userExports = tmpFiles
        .filter((file) => file.startsWith(`zexport_${req.user.id}`) && file.endsWith('.zip'))
        .map((file) => file.split('_'))
        .filter((file) => file.length === 5);

      const incompleteExports = userExports
        .filter((file) => file[file.length - 1] === 'incomplete.zip')
        .map((file) => ({
          date: Number(file[2]),
          files: Number(file[3]),
          name: file.join('_'),
        }));
      const completeExports = userExports
        .filter((file) => file[file.length - 1] === 'complete.zip')
        .map((file) => ({
          date: Number(file[2]),
          files: Number(file[3]),
          name: file.join('_'),
        }));

      if (req.query.name) {
        const file = completeExports.find((file) => file.name === req.query.name);
        if (!file) return res.notFound();

        const path = join(config.core.tempDirectory, file.name);
        return res.sendFile(path);
      }

      return res.send({
        running: incompleteExports,
        complete: completeExports,
      });
    });

    server.delete<{ Querystring: Query }>(PATH, { preHandler: [userMiddleware] }, async (req, res) => {
      if (!req.query.name) return res.badRequest('No name provided');

      const tmpFiles = await readdir(config.core.tempDirectory);
      const userExports = tmpFiles
        .filter((file) => file.startsWith(`zexport_${req.user.id}`) && file.endsWith('.zip'))
        .map((file) => file.split('_'))
        .filter((file) => file.length === 5 && file[file.length - 1] === 'complete.zip')
        .map((file) => file.join('_'));

      if (!userExports.includes(req.query.name)) return res.notFound();

      const path = join(config.core.tempDirectory, req.query.name);
      await rm(path);

      logger.info(`deleted export ${req.query.name}`);

      return res.send({ deleted: true });
    });

    server.post(PATH, { preHandler: [userMiddleware] }, async (req, res) => {
      const files = await prisma.file.findMany({
        where: { userId: req.user.id },
      });

      if (!files.length) return res.badRequest('No files to export');

      const exportFileName = `zexport_${req.user.id}_${Date.now()}_${files.length}_incomplete.zip`;
      const exportPath = join(config.core.tempDirectory, exportFileName);

      logger.debug(`exporting ${req.user.id}`, { exportPath, files: files.length });

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

          return;
        }

        writeStream.write(data);

        if (!final) return;

        const newExportName = `zexport_${req.user.id}_${Date.now()}_${files.length}_complete.zip`;
        const path = join(config.core.tempDirectory, newExportName);

        writeStream.end();
        logger.debug('exported', { path, bytes: data.length });
        logger.info(`export for ${req.user.id} finished at ${path}`);

        await rename(exportPath, path);
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
