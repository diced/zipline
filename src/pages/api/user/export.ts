import { NextApiReq, NextApiRes, withZipline } from 'middleware/withZipline';
import prisma from 'lib/prisma';
import Logger from 'lib/logger';
import { Zip, ZipPassThrough } from 'fflate';
import datasource from 'lib/datasource';
import { readdir, stat } from 'fs/promises';
import { createReadStream, createWriteStream } from 'fs';
import { tmpdir } from 'os';

async function handler(req: NextApiReq, res: NextApiRes) {
  const user = await req.user();
  if (!user) return res.forbid('not logged in');

  if (req.method === 'POST') {
    const files = await prisma.image.findMany({
      where: {
        userId: user.id,
      },
    });

    if (!files.length) return res.error('no files found');

    const zip = new Zip();
    const export_name = `zipline_export_${user.id}_${Date.now()}.zip`;
    const write_stream = createWriteStream(tmpdir() + `/${export_name}`);

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
          Logger.get('user').info(
            `Export for ${user.username} (${user.id}) has completed and is available at ${export_name}`
          );
        }
      } else {
        write_stream.close();

        Logger.get('user').error(`Export for ${user.username} (${user.id}) has failed\n${err}`);
      }
    };

    Logger.get('user').info(`Export for ${user.username} (${user.id}) has started`);
    for (let i = 0; i !== files.length; ++i) {
      const file = files[i];
      // try {
      const stream = await datasource.get(file.file);
      if (stream) {
        const def = new ZipPassThrough(file.file);
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
      }
      // } catch (e) {

      // }
    }

    zip.end();

    res.json({
      url: '/api/user/export?name=' + export_name,
    });
  } else {
    const export_name = req.query.name as string;
    if (export_name) {
      const parts = export_name.split('_');
      if (Number(parts[2]) !== user.id) return res.forbid('cannot access export');

      const stream = createReadStream(tmpdir() + `/${export_name}`);

      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${export_name}"`);
      stream.pipe(res);
    } else {
      const files = await readdir(tmpdir());
      const exp = files.filter((f) => f.startsWith('zipline_export_'));
      const exports = [];
      for (let i = 0; i !== exp.length; ++i) {
        const name = exp[i];
        const stats = await stat(tmpdir() + `/${name}`);

        if (Number(exp[i].split('_')[2]) !== user.id) continue;
        exports.push({ name, size: stats.size });
      }

      res.json({
        exports,
      });
    }
  }
}

export default withZipline(handler);
