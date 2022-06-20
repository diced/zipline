import prisma from 'lib/prisma';
import { NextApiReq, NextApiRes, withZipline } from 'middleware/withZipline';
import { checkPassword } from 'lib/util';
import datasource from 'lib/datasource';
import mimes from '../../../../scripts/mimes';
import { extname } from 'path';

async function handler(req: NextApiReq, res: NextApiRes) {
  const { id, password } = req.query;

  const image = await prisma.image.findFirst({
    where: {
      id: Number(id),
    },
  });

  if (!image) return res.status(404).end(JSON.stringify({ error: 'Image not found' }));
  if (!password) return res.forbid('No password provided');

  const valid = await checkPassword(password as string, image.password);
  if (!valid) return res.forbid('Wrong password');

  const data = datasource.get(image.file);
  if (!data) return res.error('Image not found');
  const mimetype = mimes[extname(image.file)] ?? 'application/octet-stream';
  res.setHeader('Content-Type', mimetype);

  data.pipe(res);
  data.on('error', () => res.error('Image not found'));
  data.on('end', () => res.end());
}

export default withZipline(handler);