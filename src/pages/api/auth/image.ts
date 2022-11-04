import prisma from 'lib/prisma';
import { NextApiReq, NextApiRes, withZipline } from 'middleware/withZipline';
import { checkPassword } from 'lib/util';
import datasource from 'lib/datasource';
import { guess } from 'lib/mimes';
import { extname } from 'path';

async function handler(req: NextApiReq, res: NextApiRes) {
  const { id, password } = req.query;

  const image = await prisma.image.findFirst({
    where: {
      id: Number(id),
    },
  });

  if (!image) return res.status(404).end(JSON.stringify({ error: 'Image not found' }));
  if (!password) return res.badRequest('No password provided');

  const valid = await checkPassword(password as string, image.password);
  if (!valid) return res.badRequest('Wrong password');

  const data = await datasource.get(image.file);
  if (!data) return res.notFound('Image not found');

  const size = await datasource.size(image.file);

  const mimetype = await guess(extname(image.file));
  res.setHeader('Content-Type', mimetype);
  res.setHeader('Content-Length', size);

  data.pipe(res);
  data.on('error', () => res.error('Image not found'));
  data.on('end', () => res.end());
}

export default withZipline(handler);
