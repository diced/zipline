import Busboy from 'busboy';
import prisma from 'lib/prisma';
import zconfig from 'lib/config';
import { NextApiReq, NextApiRes, withZipline } from 'lib/middleware/withZipline';
import { randomChars } from 'lib/util';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import Logger from 'lib/logger';

interface FileData {
  data: Buffer;
  ext: string;
  mimetype: string;
}

function file(req: NextApiReq): Promise<FileData> {
  return new Promise((res, rej) => {
    const busboy = new Busboy({ headers: req.headers });
    const files = [];
  
    busboy.on('file', (_, file, name, __, mimetype) => {
      const ext = name.split('.').pop();
      file.on('data', data => files.push({ data, ext, mimetype }));
    });
  
    busboy.on('finish', () => {
      res(files[0]);
    });
  
    req.pipe(busboy);
  });
}

async function handler(req: NextApiReq, res: NextApiRes) {
  if (req.method !== 'POST') return res.send(JSON.stringify({error:'no aloow'}));
  if (!req.headers.authorization) return res.forbid('no authorization');
  
  const user = await prisma.user.findFirst({
    where: {
      token: req.headers.authorization
    }
  });
  if (!user) return res.forbid('authorization incorect');

  const data = await file(req);
  const rand = randomChars(zconfig.uploader.length);

  const image = await prisma.image.create({
    data: {
      file: `${rand}.${data.ext}`,
      mimetype: data.mimetype,
      userId: user.id
    }
  });

  await writeFile(join(process.cwd(), zconfig.uploader.directory, image.file), data.data);

  Logger.get('image').info(`User ${user.username} (${user.id}) uploaded an image ${image.file} (${image.id})`);

  return res.json({
    url: `${zconfig.core.secure ? 'https' : 'http'}://${req.headers.host}${req.headers.embed ? zconfig.uploader.embed_route : zconfig.uploader.route}/${image.file}`
  });
}

export default withZipline(handler);

export const config = {
  api: {
    bodyParser: false,
  },
};