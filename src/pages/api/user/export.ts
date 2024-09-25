import { Zip, ZipPassThrough } from 'fflate';
import { createReadStream, createWriteStream } from 'fs';
import { rm, stat } from 'fs/promises';
import datasource from 'lib/datasource';
import Logger from 'lib/logger';
import prisma from 'lib/prisma';
import { NextApiReq, NextApiRes, UserExtended, withZipline } from 'middleware/withZipline';
import { join } from 'path';

const logger = Logger.get('user::export');

async function handler(req: NextApiReq, res: NextApiRes, user: UserExtended) {
  if (req.method === 'POST') {
    const files = await prisma.file.findMany({
      where: {
        userId: user.id,
      },
    });

    if (!files.length) return res.notFound('no files found');

    const zip = new Zip();
    const export_name = `zipline_export_${user.id}_${Date.now()}.zip`;
    const path = join(config.core.temp_directory, export_name);

    const exportDb = await prisma.export.create({
      data: {
        path: export_name,
        userId: user.id,
      },
    });

    logger.debug(`creating write stream at ${path}`);
    const write_stream = createWriteStream(path);

    // i found this on some stack overflow thing, forgot the url
    const onBackpressure = (stream, outputStream, cb) => {
      const runCb = () => {
        cb(applyOutputBackpressure || backpressureBytes > backpressureThreshold);
      };

      const backpressureThreshold = 65536;
      const backpressure = [];
      let backpressureBytes = 0;
      const push = stream.push;
      stream.push = (dat, final) => {
        backpressure.push(dat.length);
        backpressureBytes += dat.length;
        runCb();
        push.call(stream, dat, final);
      };
      let ondata = stream.ondata;
      const ondataPatched = (err, dat, final) => {
        ondata.call(stream, err, dat, final);
        backpressureBytes -= backpressure.shift();
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
      outputStream.write = (data) => {
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
      if (!err) {
        write_stream.write(data);
        if (final) {
          write_stream.close();
          logger.debug(`finished writing zip to ${path} at ${data.length} bytes written`);
          logger.info(
            `Export for ${user.username} (${user.id}) has completed and is available at ${export_name}`,
          );

          await prisma.export.update({
            where: {
              id: exportDb.id,
            },
            data: {
              complete: true,
            },
          });
        }
      } else {
        write_stream.close();
        logger.error(
          `Export for ${user.username} (${user.id}) has failed and has been removed from the database\n${err}`,
        );

        await prisma.export.delete({
          where: {
            id: exportDb.id,
          },
        });
      }
    };

    logger.info(`Export for ${user.username} (${user.id}) has started`);
    for (let i = 0; i !== files.length; ++i) {
      const file = files[i];

      const stream = await datasource.get(file.name);
      if (stream) {
        const def = new ZipPassThrough(file.name);
        zip.add(def);
        onBackpressure(def, stream, (shouldApplyBackpressure) => {
          if (shouldApplyBackpressure) {
            stream.pause();
          } else if (stream.isPaused()) {
            stream.resume();
          }
        });
        stream.on('data', (c) => def.push(c));
        stream.on('end', () => def.push(new Uint8Array(0), true));
      } else {
        logger.debug(`couldn't find stream for ${file.name}`);
      }
    }

    zip.end();

    res.json({
      url: '/api/user/export?name=' + export_name,
    });
  } else if (req.method === 'DELETE') {
    const name = req.query.name as string;
    if (!name) return res.badRequest('no name provided');

    const exportDb = await prisma.export.findFirst({
      where: {
        userId: user.id,
        path: name,
      },
    });

    if (!exportDb) return res.notFound('export not found');

    await prisma.export.delete({
      where: {
        id: exportDb.id,
      },
    });

    try {
      await rm(join(config.core.temp_directory, exportDb.path));
    } catch (e) {
      logger
        .error(`export file ${exportDb.path} has been removed from the database`)
        .error(`but failed to remove the file from the filesystem: ${e}`);
    }

    res.json({
      success: true,
    });
  } else {
    const exportsDb = await prisma.export.findMany({
      where: {
        userId: user.id,
      },
    });

    const name = req.query.name as string;
    if (name) {
      const exportDb = exportsDb.find((e) => e.path === name);
      if (!exportDb) return res.notFound('export not found');

      const stream = createReadStream(join(config.core.temp_directory, exportDb.path));

      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${exportDb.path}"`);
      stream.pipe(res);
    } else {
      const exports = [];

      for (let i = 0; i !== exportsDb.length; ++i) {
        const exportDb = exportsDb[i];
        if (!exportDb.complete) continue;

        const stats = await stat(join(config.core.temp_directory, exportDb.path));
        exports.push({ name: exportDb.path, size: stats.size, createdAt: exportDb.createdAt });
      }

      res.json({
        exports,
      });
    }
  }
}

export default withZipline(handler, {
  methods: ['GET', 'POST', 'DELETE'],
  user: true,
});
