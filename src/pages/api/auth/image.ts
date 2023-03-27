import datasource from 'lib/datasource';
import { guess } from 'lib/mimes';
import prisma from 'lib/prisma';
import { checkPassword } from 'lib/util';
import { NextApiReq, NextApiRes, withZipline } from 'middleware/withZipline';
import { extname } from 'path';

async function handler(req: NextApiReq, res: NextApiRes) {
  const { id, password } = req.query;

  const image = await prisma.image.findFirst({
    where: {
      id: Number(id),
    },
  });

  if (!image) return res.notFound('image not found');
  if (!password) return res.badRequest('no password provided');

  const valid = await checkPassword(password as string, image.password);
  if (!valid) return res.badRequest('wrong password');

  const data = await datasource.get(image.file);
  if (!data) return res.notFound('image not found');

  const size = await datasource.size(image.file);

  const mimetype = await guess(extname(image.file));
  res.setHeader('Content-Type', mimetype);
  res.setHeader('Content-Length', size);

  data.pipe(res);
  data.on('error', () => res.notFound('image not found'));
  data.on('end', () => res.end());
}

export default withZipline(handler);
