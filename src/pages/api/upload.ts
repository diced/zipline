import multer from 'multer';
import prisma from 'lib/prisma';
import zconfig from 'lib/config';
import { NextApiReq, NextApiRes, withZipline } from 'lib/middleware/withZipline';
import { createInvis, randomChars } from 'lib/util';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import Logger from 'lib/logger';

const uploader = multer({
  storage: multer.memoryStorage(),
});

async function handler(req: NextApiReq, res: NextApiRes) {
  if (req.method !== 'POST') return res.forbid('no allow');
  if (!req.headers.authorization) return res.forbid('no authorization');
  
  const user = await prisma.user.findFirst({
    where: {
      token: req.headers.authorization
    }
  });
  if (!user) return res.forbid('authorization incorect');
  if (!req.file) return res.error('no file');
  if (req.file.size > zconfig.uploader[user.administrator ? 'admin_limit' : 'user_limit']) return res.error('file size too big');

  const ext = req.file.originalname.split('.').pop();
  if (zconfig.uploader.disabled_extentions.includes(ext)) return res.error('disabled extension recieved: ' + ext);
  const rand = randomChars(zconfig.uploader.length);

  let invis;
  const image = await prisma.image.create({
    data: {
      file: `${rand}.${ext}`,
      mimetype: req.file.mimetype,
      userId: user.id,
      embed: !!req.headers.embed
    }
  });
  
  if (req.headers.zws) invis = await createInvis(zconfig.uploader.length, image.id);

  await writeFile(join(process.cwd(), zconfig.uploader.directory, image.file), req.file.buffer);

  Logger.get('image').info(`User ${user.username} (${user.id}) uploaded an image ${image.file} (${image.id})`);

  return res.json({
    url: `${zconfig.core.secure ? 'https' : 'http'}://${req.headers.host}${zconfig.uploader.route}/${invis ? invis.invis : image.file}`
  });
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
  await run(uploader.single('file'))(req, res);
  
  return withZipline(handler)(req, res);
};

export const config = {
  api: {
    bodyParser: false,
  },
};