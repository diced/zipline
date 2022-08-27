import multer from 'multer';
import prisma from 'lib/prisma';
import zconfig from 'lib/config';
import { NextApiReq, NextApiRes, withZipline } from 'lib/middleware/withZipline';
import { createInvisImage, randomChars, hashPassword } from 'lib/util';
import Logger from 'lib/logger';
import { ImageFormat, InvisibleImage } from '@prisma/client';
import { format as formatDate } from 'fecha';
import datasource from 'lib/datasource';
import { randomUUID } from 'crypto';
import sharp from 'sharp';
import { humanTime, parseExpiry } from 'lib/clientUtils';
import { StringValue } from 'ms';
import { sendUpload } from 'lib/discord';

const uploader = multer();

async function handler(req: NextApiReq, res: NextApiRes) {
  if (req.method !== 'POST') return res.forbid('invalid method');
  if (!req.headers.authorization) return res.forbid('no authorization');

  const user = await prisma.user.findFirst({
    where: {
      token: req.headers.authorization,
    },
  });

  if (!user) return res.forbid('authorization incorect');
  if (user.ratelimit) {
    const remaining = user.ratelimit.getTime() - Date.now();
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

  await run(uploader.array('file'))(req, res);

  if (!req.files) return res.error('no files');
  if (req.files && req.files.length === 0) return res.error('no files');

  const response: { files: string[], expires_at?: Date } = { files: [] };

  const expires_at = req.headers['expires-at'] as string;
  let expiry: Date;

  if (expires_at) {
    expiry = parseExpiry(expires_at);
    if (!expiry) return res.error('invalid date');
    else {
      response.expires_at = expiry;
    }
  }

  const rawFormat = ((req.headers.format || '') as string).toUpperCase() || 'RANDOM';
  const format: ImageFormat = Object.keys(ImageFormat).includes(rawFormat) && ImageFormat[rawFormat];

  const imageCompressionPercent = req.headers['image-compression-percent'] ? Number(req.headers['image-compression-percent']) : null;


  for (let i = 0; i !== req.files.length; ++i) {
    const file = req.files[i];
    if (file.size > zconfig.uploader[user.administrator ? 'admin_limit' : 'user_limit']) return res.error(`file[${i}] size too big`);

    const ext = file.originalname.split('.').pop();
    if (zconfig.uploader.disabled_extensions.includes(ext)) return res.error('disabled extension recieved: ' + ext);
    let fileName: string;

    switch (format) {
      case ImageFormat.RANDOM:
        fileName = randomChars(zconfig.uploader.length);
        break;
      case ImageFormat.DATE:
        fileName = formatDate(new Date(), 'YYYY-MM-DD_HH:mm:ss');
        break;
      case ImageFormat.UUID:
        fileName = randomUUID({ disableEntropyCache: true });
        break;
      case ImageFormat.NAME:
        fileName = file.originalname.split('.')[0];
        break;
      default:
        fileName = randomChars(zconfig.uploader.length);
        break;
    }

    let password = null;
    if (req.headers.password) {
      password = await hashPassword(req.headers.password as string);
    }

    const compressionUsed = imageCompressionPercent && file.mimetype.startsWith('image/');
    let invis: InvisibleImage;
    const image = await prisma.image.create({
      data: {
        file: `${fileName}.${compressionUsed ? 'jpg' : ext}`,
        mimetype: req.headers.uploadtext ? 'text/plain' : (compressionUsed ? 'image/jpeg' : file.mimetype),
        userId: user.id,
        embed: !!req.headers.embed,
        format,
        password,
        expires_at: expiry,
      },
    });

    if (req.headers.zws) invis = await createInvisImage(zconfig.uploader.length, image.id);

    if (compressionUsed) {
      const buffer = await sharp(file.buffer).jpeg({ quality: imageCompressionPercent }).toBuffer();
      await datasource.save(image.file, buffer);
      Logger.get('image').info(`User ${user.username} (${user.id}) compressed image from ${file.buffer.length} -> ${buffer.length} bytes`);
    } else {
      await datasource.save(image.file, file.buffer);
    }

    Logger.get('image').info(`User ${user.username} (${user.id}) uploaded an image ${image.file} (${image.id})`);
    if (user.domains.length) {
      const domain = user.domains[Math.floor(Math.random() * user.domains.length)];
      response.files.push(`${domain}${zconfig.uploader.route === '/' ? '' : zconfig.uploader.route}/${invis ? invis.invis : image.file}`);
    } else {
      response.files.push(`${zconfig.core.https ? 'https' : 'http'}://${req.headers.host}${zconfig.uploader.route === '/' ? '' : zconfig.uploader.route}/${invis ? invis.invis : image.file}`);
    }

    if (zconfig.discord?.upload) {
      await sendUpload(user, image, `${zconfig.core.https ? 'https' : 'http'}://${req.headers.host}${zconfig.uploader.route === '/' ? '' : zconfig.uploader.route}/${invis ? invis.invis : image.file}`);
    }
  }

  if (user.administrator && zconfig.ratelimit.admin > 0) {
    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        ratelimit: new Date(Date.now() + (zconfig.ratelimit.admin * 1000)),
      },
    });
  } else if (!user.administrator && zconfig.ratelimit.user > 0) {
    if (user.administrator && zconfig.ratelimit.user > 0) {
      await prisma.user.update({
        where: {
          id: user.id,
        },
        data: {
          ratelimit: new Date(Date.now() + (zconfig.ratelimit.user * 1000)),
        },
      });
    }
  }

  return res.json(response);
}

function run(middleware: any) {
  return (req, res) =>
    new Promise((resolve, reject) => {
      middleware(req, res, (result) => {
        if (result instanceof Error) reject(result);
        resolve(result);
      });
    });
}

export default async function handlers(req, res) {
  return withZipline(handler)(req, res);
};

export const config = {
  api: {
    bodyParser: false,
  },
};