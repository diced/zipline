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

  const rawFormat = ((req.headers.format || '') as string).toUpperCase() || 'RANDOM';
  const format: ImageFormat = Object.keys(ImageFormat).includes(rawFormat) && ImageFormat[rawFormat];
  const files = [];
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
    }

    let password = null;
    if (req.headers.password) {
      password = await hashPassword(req.headers.password as string);
    }

    let invis: InvisibleImage;
    const image = await prisma.image.create({
      data: {
        file: `${fileName}.${ext}`,
        mimetype: file.mimetype,
        userId: user.id,
        embed: !!req.headers.embed,
        format,
        password,
      },
    });

    if (req.headers.zws) invis = await createInvisImage(zconfig.uploader.length, image.id);

    await datasource.save(image.file, file.buffer);
    Logger.get('image').info(`User ${user.username} (${user.id}) uploaded an image ${image.file} (${image.id})`);
    if (user.domains.length) {
      const domain = user.domains[Math.floor(Math.random() * user.domains.length)];
      files.push(`${domain}${zconfig.uploader.route === '/' ? '' : zconfig.uploader.route}/${invis ? invis.invis : image.file}`);
    } else {
      files.push(`${zconfig.core.secure ? 'https' : 'http'}://${req.headers.host}${zconfig.uploader.route === '/' ? '' : zconfig.uploader.route}/${invis ? invis.invis : image.file}`);
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

  return res.json({ files });
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