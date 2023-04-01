import { InvisibleFile } from '@prisma/client';
import { readdir, readFile, unlink, writeFile } from 'fs/promises';
import zconfig from 'lib/config';
import datasource from 'lib/datasource';
import { sendUpload } from 'lib/discord';
import formatFileName, { NameFormat, NameFormats } from 'lib/format';
import Logger from 'lib/logger';
import { NextApiReq, NextApiRes, withZipline } from 'lib/middleware/withZipline';
import { guess } from 'lib/mimes';
import prisma from 'lib/prisma';
import { createInvisImage, hashPassword } from 'lib/util';
import { parseExpiry } from 'lib/utils/client';
import { removeGPSData } from 'lib/utils/exif';
import multer from 'multer';
import { join } from 'path';
import sharp from 'sharp';

const uploader = multer();
const logger = Logger.get('upload');

async function handler(req: NextApiReq, res: NextApiRes) {
  if (!req.headers.authorization) return res.forbidden('no authorization');

  const user = await prisma.user.findFirst({
    where: {
      token: req.headers.authorization,
    },
  });

  if (!user) return res.forbidden('authorization incorrect');

  await new Promise((resolve, reject) => {
    uploader.array('file')(req as never, res as never, (result: unknown) => {
      if (result instanceof Error) reject(result.message);
      resolve(result);
    });
  });

  const response: {
    files: string[];
    expiresAt?: Date;
    removed_gps?: boolean;
    assumed_mimetype?: string | boolean;
  } = {
    files: [],
  };
  const expiresAt = req.headers['expires-at'] as string;
  let expiry: Date;

  if (expiresAt) {
    expiry = parseExpiry(expiresAt);
    if (!expiry) return res.badRequest('invalid date');
    else {
      response.expiresAt = expiry;
    }
  }

  if (zconfig.uploader.default_expiration) {
    expiry = parseExpiry(zconfig.uploader.default_expiration);
    if (!expiry) return res.badRequest('invalid date (UPLOADER_DEFAULT_EXPIRATION)');
  }

  const rawFormat = ((req.headers['format'] as string) || zconfig.uploader.default_format).toLowerCase();
  const format = NameFormats.includes(rawFormat as NameFormat)
    ? (rawFormat as NameFormat)
    : ('random' as NameFormat);

  const imageCompressionPercent = req.headers['image-compression-percent']
    ? Number(req.headers['image-compression-percent'])
    : null;
  if (isNaN(imageCompressionPercent))
    return res.badRequest('invalid image compression percent (invalid number)');
  if (imageCompressionPercent < 0 || imageCompressionPercent > 100)
    return res.badRequest('invalid image compression percent (% < 0 || % > 100)');

  const fileMaxViews = req.headers['max-views'] ? Number(req.headers['max-views']) : null;
  if (isNaN(fileMaxViews)) return res.badRequest('invalid max views (invalid number)');
  if (fileMaxViews < 0) return res.badRequest('invalid max views (max views < 0)');

  // handle partial uploads before ratelimits
  if (req.headers['content-range']) {
    // parses content-range header (bytes start-end/total)
    const [start, end, total] = req.headers['content-range']
      .replace('bytes ', '')
      .replace('-', '/')
      .split('/')
      .map((x) => Number(x));

    const filename = req.headers['x-zipline-partial-filename'] as string;
    const mimetype = req.headers['x-zipline-partial-mimetype'] as string;
    const identifier = req.headers['x-zipline-partial-identifier'];
    const lastchunk = req.headers['x-zipline-partial-lastchunk'] === 'true';

    logger.debug(
      `recieved partial upload ${JSON.stringify({
        filename,
        mimetype,
        identifier,
        lastchunk,
        start,
        end,
        total,
      })}`
    );

    const tempFile = join(zconfig.core.temp_directory, `zipline_partial_${identifier}_${start}_${end}`);
    logger.debug(`writing partial to disk ${tempFile}`);
    await writeFile(tempFile, req.files[0].buffer);

    if (lastchunk) {
      const partials = await readdir(zconfig.core.temp_directory).then((files) =>
        files.filter((x) => x.startsWith(`zipline_partial_${identifier}`))
      );

      const readChunks = partials.map((x) => {
        const [, , , start, end] = x.split('_');
        return { start: Number(start), end: Number(end), filename: x };
      });

      // combine chunks
      const chunks = new Uint8Array(total);

      for (let i = 0; i !== readChunks.length; ++i) {
        const chunkData = readChunks[i];

        const buffer = await readFile(join(zconfig.core.temp_directory, chunkData.filename));
        await unlink(join(zconfig.core.temp_directory, readChunks[i].filename));

        chunks.set(buffer, chunkData.start);
      }

      const ext = filename.split('.').length === 1 ? '' : filename.split('.').pop();
      if (zconfig.uploader.disabled_extensions.includes(ext))
        return res.error('disabled extension recieved: ' + ext);
      const fileName = await formatFileName(format, filename);

      let password = null;
      if (req.headers.password) {
        password = await hashPassword(req.headers.password as string);
      }

      const compressionUsed = imageCompressionPercent && mimetype.startsWith('image/');
      let invis: InvisibleFile;

      const file = await prisma.file.create({
        data: {
          name: `${fileName}${compressionUsed ? '.jpg' : `${ext ? '.' : ''}${ext}`}`,
          mimetype,
          userId: user.id,
          embed: !!req.headers.embed,
          password,
          expiresAt: expiry,
          maxViews: fileMaxViews,
          originalName: req.headers['original-name'] ? filename ?? null : null,
        },
      });

      if (req.headers.zws) invis = await createInvisImage(zconfig.uploader.length, file.id);

      await datasource.save(file.name, Buffer.from(chunks));

      logger.info(`User ${user.username} (${user.id}) uploaded ${file.name} (${file.id}) (chunked)`);
      let domain;
      if (req.headers['override-domain']) {
        domain = `${zconfig.core.return_https ? 'https' : 'http'}://${req.headers['override-domain']}`;
      } else if (user.domains.length) {
        domain = user.domains[Math.floor(Math.random() * user.domains.length)];
      } else {
        domain = `${zconfig.core.return_https ? 'https' : 'http'}://${req.headers.host}`;
      }

      const responseUrl = `${domain}${zconfig.uploader.route === '/' ? '/' : zconfig.uploader.route + '/'}${
        invis ? invis.invis : encodeURI(file.name)
      }`;

      response.files.push(responseUrl);

      if (zconfig.discord?.upload) {
        await sendUpload(user, file, `${domain}/r/${invis ? invis.invis : file.name}`, responseUrl);
      }

      if (zconfig.exif.enabled && zconfig.exif.remove_gps && mimetype.startsWith('image/')) {
        try {
          await removeGPSData(file);
          response.removed_gps = true;
        } catch (e) {
          logger.error(`Failed to remove GPS data from ${file.name} (${file.id}) - ${e.message}`);

          response.removed_gps = false;
        }
      }

      return res.json(response);
    }

    return res.json({
      success: true,
    });
  }

  if (user.ratelimit) {
    const remaining = user.ratelimit.getTime() - Date.now();
    logger.debug(`${user.id} encountered ratelimit, ${remaining}ms remaining`);
    if (remaining <= 0) {
      await prisma.user.update({
        where: {
          id: user.id,
        },
        data: {
          ratelimit: null,
        },
      });
    } else {
      return res.ratelimited(remaining);
    }
  }

  if (!req.files) return res.badRequest('no files');
  if (req.files && req.files.length === 0) return res.badRequest('no files');

  logger.debug(
    `recieved upload (len=${req.files.length}) ${JSON.stringify(
      req.files.map((x) => ({
        fieldname: x.fieldname,
        originalname: x.originalname,
        mimetype: x.mimetype,
        size: x.size,
        encoding: x.encoding,
      }))
    )}`
  );

  for (let i = 0; i !== req.files.length; ++i) {
    const file = req.files[i];
    if (file.size > zconfig.uploader[user.administrator ? 'admin_limit' : 'user_limit'])
      return res.badRequest(`file[${i}]: size too big`);
    if (!file.originalname) return res.badRequest(`file[${i}]: no filename`);

    const ext = file.originalname.split('.').length === 1 ? '' : file.originalname.split('.').pop();
    if (zconfig.uploader.disabled_extensions.includes(ext))
      return res.badRequest(`file[${i}]: disabled extension recieved: ${ext}`);
    let fileName = await formatFileName(format, file.originalname);

    if (req.headers['x-zipline-filename']) {
      fileName = req.headers['x-zipline-filename'] as string;
      const existing = await prisma.file.findFirst({
        where: {
          name: fileName,
        },
      });
      if (existing) return res.badRequest(`file[${i}]: filename already exists: '${fileName}'`);
    }

    let password = null;
    if (req.headers.password) {
      password = await hashPassword(req.headers.password as string);
    }

    let mimetype = file.mimetype;

    if (file.mimetype === 'application/octet-stream' && zconfig.uploader.assume_mimetypes) {
      const ext = file.originalname.split('.').pop();
      const mime = await guess(ext);

      if (!mime) response.assumed_mimetype = false;
      else {
        response.assumed_mimetype = mime;
        mimetype = mime;
      }
    }

    const compressionUsed = imageCompressionPercent && file.mimetype.startsWith('image/');
    let invis: InvisibleFile;
    const fileUpload = await prisma.file.create({
      data: {
        name: `${fileName}${compressionUsed ? '.jpg' : `${ext ? '.' : ''}${ext}`}`,
        mimetype: req.headers.uploadtext ? 'text/plain' : compressionUsed ? 'image/jpeg' : mimetype,
        userId: user.id,
        embed: !!req.headers.embed,
        password,
        expiresAt: expiry,
        maxViews: fileMaxViews,
        originalName: req.headers['original-name'] ? file.originalname ?? null : null,
        size: file.size,
      },
    });

    if (req.headers.zws) invis = await createInvisImage(zconfig.uploader.length, fileUpload.id);

    if (compressionUsed) {
      const buffer = await sharp(file.buffer).jpeg({ quality: imageCompressionPercent }).toBuffer();
      await datasource.save(fileUpload.name, buffer);
      logger.info(
        `User ${user.username} (${user.id}) compressed image from ${file.buffer.length} -> ${buffer.length} bytes`
      );
    } else {
      await datasource.save(fileUpload.name, file.buffer);
    }

    logger.info(`User ${user.username} (${user.id}) uploaded ${fileUpload.name} (${fileUpload.id})`);
    let domain;
    if (req.headers['override-domain']) {
      domain = `${zconfig.core.return_https ? 'https' : 'http'}://${req.headers['override-domain']}`;
    } else if (user.domains.length) {
      domain = user.domains[Math.floor(Math.random() * user.domains.length)];
    } else {
      domain = `${zconfig.core.return_https ? 'https' : 'http'}://${req.headers.host}`;
    }

    const responseUrl = `${domain}${zconfig.uploader.route === '/' ? '/' : zconfig.uploader.route + '/'}${
      invis ? invis.invis : encodeURI(fileUpload.name)
    }`;

    response.files.push(responseUrl);

    if (zconfig.discord?.upload) {
      await sendUpload(user, fileUpload, `${domain}/r/${invis ? invis.invis : fileUpload.name}`, responseUrl);
    }

    if (zconfig.exif.enabled && zconfig.exif.remove_gps && fileUpload.mimetype.startsWith('image/')) {
      try {
        await removeGPSData(fileUpload);
        response.removed_gps = true;
      } catch (e) {
        logger.error(`Failed to remove GPS data from ${fileUpload.name} (${fileUpload.id}) - ${e.message}`);

        response.removed_gps = false;
      }
    }
  }

  if (user.administrator && zconfig.ratelimit.admin > 0) {
    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        ratelimit: new Date(Date.now() + zconfig.ratelimit.admin * 1000),
      },
    });
  } else if (!user.administrator && zconfig.ratelimit.user > 0) {
    if (user.administrator && zconfig.ratelimit.user > 0) {
      await prisma.user.update({
        where: {
          id: user.id,
        },
        data: {
          ratelimit: new Date(Date.now() + zconfig.ratelimit.user * 1000),
        },
      });
    }
  }

  if (req.headers['no-json']) {
    res.setHeader('Content-Type', 'text/plain');
    return res.end(response.files.join(','));
  }

  return res.json(response);
}

export default withZipline(handler, {
  methods: ['POST'],
});

export const config = {
  api: {
    bodyParser: false,
  },
};
