import multer from 'multer';
import prisma from 'lib/prisma';
import zconfig from 'lib/config';
import { NextApiReq, NextApiRes, withZipline } from 'lib/middleware/withZipline';
import { createInvisImage, randomChars } from 'lib/util';
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
  if (!req.files) return res.error('no files');
  if (req.files && req.files.length === 0) return res.error('no files');

  const files = [];

  for (let i = 0; i !== req.files.length; ++i) {
    const file = req.files[i];
    if (file.size > zconfig.uploader[user.administrator ? 'admin_limit' : 'user_limit']) return res.error('file size too big');

    const ext = file.originalname.split('.').pop();
    if (zconfig.uploader.disabled_extentions.includes(ext)) return res.error('disabled extension recieved: ' + ext);
    const rand = randomChars(zconfig.uploader.length);

    let invis;
    const image = await prisma.image.create({
      data: {
        file: `${rand}.${ext}`,
        mimetype: file.mimetype,
        userId: user.id,
        embed: !!req.headers.embed
      }
    });
    
    if (req.headers.zws) invis = await createInvisImage(zconfig.uploader.length, image.id);

    await writeFile(join(process.cwd(), zconfig.uploader.directory, image.file), file.buffer);
    Logger.get('image').info(`User ${user.username} (${user.id}) uploaded an image ${image.file} (${image.id})`); 
    files.push(`${zconfig.core.secure ? 'https' : 'http'}://${req.headers.host}${zconfig.uploader.route}/${invis ? invis.invis : image.file}`);
  }

  // url will be deprecated soon
  return res.json({ files, url: files[0] });
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