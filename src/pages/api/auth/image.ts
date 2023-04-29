import datasource from 'lib/datasource';
import { guess } from 'lib/mimes';
import prisma from 'lib/prisma';
import { checkPassword } from 'lib/util';
import { NextApiReq, NextApiRes, withZipline } from 'middleware/withZipline';
import { extname } from 'path';

async function handler(req: NextApiReq, res: NextApiRes) {
  const { id, password } = req.query;
  if (isNaN(Number(id))) return res.badRequest('invalid id');

  const file = await prisma.file.findFirst({
    where: {
      id: Number(id),
    },
  });

  if (!file) return res.notFound('image not found');
  if (!password) return res.badRequest('no password provided');

  const decoded = decodeURIComponent(password as string);

  const valid = await checkPassword(decoded, file.password);
  if (!valid) return res.badRequest('wrong password');

  const data = await datasource.get(file.name);
  if (!data) return res.notFound('image not found');

  const size = await datasource.size(file.name);

  const mimetype = await guess(extname(file.name));
  res.setHeader('Content-Type', mimetype);
  res.setHeader('Content-Length', size);

  data.pipe(res);
  data.on('error', () => res.notFound('image not found'));
  data.on('end', () => res.end());
}

export default withZipline(handler);
