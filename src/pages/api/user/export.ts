import { NextApiReq, NextApiRes, withZipline } from 'middleware/withZipline';
import prisma from 'lib/prisma';
import Logger from 'lib/logger';
import { Zip, ZipPassThrough } from 'fflate';
import datasource from 'lib/datasource';
import { readdir } from 'fs/promises';
import { createReadStream, createWriteStream } from 'fs';

async function handler(req: NextApiReq, res: NextApiRes) {
  const user = await req.user();
  if (!user) return res.forbid('not logged in');

  if (req.method === 'POST') {
    const files = await prisma.image.findMany({
      where: {
        userId: user.id,
      },
    });

    const zip = new Zip();
    const export_name = `zipline_export_${user.id}_${Date.now()}.zip`;
    const write_stream = createWriteStream(`/tmp/${export_name}`);

    const onBackpressure = (stream, outputStream, cb) => {
      const runCb = () => {
        // Pause if either output or internal backpressure should be applied
        cb(applyOutputBackpressure || backpressureBytes > backpressureThreshold);
      };

      // Internal backpressure (for when AsyncZipDeflate is slow)
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
        // You can remove this condition if you make sure to
        // call zip.add(file) before calling onBackpressure
        Object.defineProperty(stream, 'ondata', {
          get: () => ondataPatched,
          set: cb => ondata = cb,
        });
      }

      // Output backpressure (for when outputStream is slow)
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
          Logger.get('user').info(`Export for ${user.username} (${user.id}) has completed and is available at ${export_name}`);
        }
      } else {
        write_stream.close();

        Logger.get('user').error(`Export for ${user.username} (${user.id}) has failed\n${err}`);
      }
    };

    // for (const file of files) {
    Logger.get('user').info(`Export for ${user.username} (${user.id}) has started`);
    for (let i = 0; i !== files.length; ++i) {
      const file = files[i];
      const stream = await datasource.get(file.file);
      if (stream) {
        const def = new ZipPassThrough(file.file);
        zip.add(def);
        onBackpressure(def, stream, shouldApplyBackpressure => {
          if (shouldApplyBackpressure) {
            stream.pause();
          } else if (stream.isPaused()) {
            stream.resume();
          }
        });
        stream.on('data', c => def.push(c));
        stream.on('end', () => def.push(new Uint8Array(0), true));
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
      if (Number(parts[2]) !== user.id) return res.forbid('cannot access export');

      const stream = createReadStream(`/tmp/${export_name}`);

      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${export_name}"`);
      stream.pipe(res);
    } else {
      const files = await readdir('/tmp');
      const exports = files.filter(f => f.startsWith('zipline_export_'));
      res.json({
        exports,
      });
    }
  }
}

export default withZipline(handler);