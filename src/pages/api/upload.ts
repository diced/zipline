import multer from 'multer';
import prisma from 'lib/prisma';
import zconfig from 'lib/config';
import { NextApiReq, NextApiRes, withZipline } from 'lib/middleware/withZipline';
import { createInvisImage, randomChars } from 'lib/util';
import Logger from 'lib/logger';
import { ImageFormat, InvisibleImage } from '@prisma/client';
import { format as formatDate } from 'fecha';
import { v4 } from 'uuid';
import datasource from 'lib/ds';

const uploader = multer({
  storage: multer.memoryStorage(),
});

async function handler(req: NextApiReq, res: NextApiRes) {
  if (req.method !== 'POST') return res.forbid('invalid method');
  if (!req.headers.authorization) return res.forbid('no authorization');
  
  const user = await prisma.user.findFirst({
    where: {
      token: req.headers.authorization,
    },
  });

  if (!user) return res.forbid('authorization incorect');
  if (user.ratelimited) return res.ratelimited();
  if (!req.files) return res.error('no files');
  if (req.files && req.files.length === 0) return res.error('no files');

  const rawFormat = ((req.headers.format || '') as string).toUpperCase() || 'RANDOM';
  const format: ImageFormat = Object.keys(ImageFormat).includes(rawFormat) && ImageFormat[rawFormat];
  const files = [];

  for (let i = 0; i !== req.files.length; ++i) {
    const file = req.files[i];
    if (file.size > zconfig.uploader[user.administrator ? 'admin_limit' : 'user_limit']) return res.error(`file[${i}] size too big`);

    const ext = file.originalname.split('.').pop();
    if (zconfig.uploader.disabled_extentions.includes(ext)) return res.error('disabled extension recieved: ' + ext);
    let fileName: string;

    switch (format) {
    case ImageFormat.RANDOM:
      fileName = randomChars(zconfig.uploader.length);
      break;
    case ImageFormat.DATE:
      fileName = formatDate(new Date(), 'YYYY-MM-DD_HH:mm:ss');
      break;
    case ImageFormat.UUID:
      fileName = v4();
      break;
    case ImageFormat.NAME:
      fileName = file.originalname.split('.')[0];
      break;
    }


    let invis: InvisibleImage;
    const image = await prisma.image.create({
      data: {
        file: `${fileName}.${ext}`,
        mimetype: file.mimetype,
        userId: user.id,
        embed: !!req.headers.embed,
        format,
      },
    });
    
    if (req.headers.zws) invis = await createInvisImage(zconfig.uploader.length, image.id);

    await datasource.save(image.file, file.buffer);
    Logger.get('image').info(`User ${user.username} (${user.id}) uploaded an image ${image.file} (${image.id})`); 
    if (user.domains.length) {
      const domain = user.domains[Math.floor(Math.random() * user.domains.length)];
      files.push(`${domain}${zconfig.uploader.route}/${invis ? invis.invis : image.file}`);
    } else {
      files.push(`${zconfig.core.secure ? 'https' : 'http'}://${req.headers.host}${zconfig.uploader.route}/${invis ? invis.invis : image.file}`);
    }
  }

  if (user.administrator && zconfig.ratelimit.admin !== 0) {
    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        ratelimited: true,
      },
    });
    setTimeout(async () => await prisma.user.update({ where: { id: user.id }, data: { ratelimited: false } }), zconfig.ratelimit.admin * 1000).unref();
  }

  if (!user.administrator && zconfig.ratelimit.user !== 0) {
    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        ratelimited: true,
      },
    });
    setTimeout(async () => await prisma.user.update({ where: { id: user.id }, data: { ratelimited: false } }), zconfig.ratelimit.user * 1000).unref();
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
  await run(uploader.array('file'))(req, res);
  
  return withZipline(handler)(req, res);
};

export const config = {
  api: {
    bodyParser: false,
  },
};