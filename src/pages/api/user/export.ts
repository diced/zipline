import { Zip, ZipPassThrough } from 'fflate';
import { createReadStream, createWriteStream } from 'fs';
import { readdir, stat } from 'fs/promises';
import datasource from 'lib/datasource';
import Logger from 'lib/logger';
import prisma from 'lib/prisma';
import { NextApiReq, NextApiRes, UserExtended, withZipline } from 'middleware/withZipline';
import { tmpdir } from 'os';
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
    const path = join(tmpdir(), export_name);

    logger.debug(`creating write stream at ${path}`);
    const write_stream = createWriteStream(path);

    // i found this on some stack overflow thing, forgot the url
    const onBackpressure = (stream, outputStream, cb) => {
      const runCb = () => {
        cb(applyOutputBackpressure || backpressureBytes > backpressureThreshold);
      };

      const backpressureThreshold = 65536;
      let backpressure = [];
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
            `Export for ${user.username} (${user.id}) has completed and is available at ${export_name}`
          );
        }
      } else {
        write_stream.close();
        logger.debug(`error while writing to zip: ${err}`);
        logger.error(`Export for ${user.username} (${user.id}) has failed\n${err}`);
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
  } else {
    const export_name = req.query.name as string;
    if (export_name) {
      const parts = export_name.split('_');
      if (Number(parts[2]) !== user.id) return res.unauthorized('cannot access export owned by another user');

      const stream = createReadStream(join(tmpdir(), export_name));

      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${export_name}"`);
      stream.pipe(res);
    } else {
      const files = await readdir(tmpdir());
      const exp = files.filter((f) => f.startsWith('zipline_export_'));
      const exports = [];
      for (let i = 0; i !== exp.length; ++i) {
        const name = exp[i];
        const stats = await stat(join(tmpdir(), name));

        if (Number(exp[i].split('_')[2]) !== user.id) continue;
        exports.push({ name, size: stats.size });
      }

      res.json({
        exports,
      });
    }
  }
}

export default withZipline(handler, {
  methods: ['GET', 'POST'],
  user: true,
});
