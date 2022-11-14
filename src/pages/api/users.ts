import prisma from 'lib/prisma';
import { NextApiReq, NextApiRes, withZipline } from 'middleware/withZipline';

async function handler(_: NextApiReq, res: NextApiRes) {
  const users = await prisma.user.findMany();
  for (let i = 0; i !== users.length; ++i) delete users[i].password;

  return res.json(users);
}

export default withZipline(handler, {
  methods: ['GET', 'POST'],
  user: true,
  administrator: true,
});
