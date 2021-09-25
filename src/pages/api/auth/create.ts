import prisma from 'lib/prisma';
import { NextApiReq, NextApiRes, withZipline } from 'lib/middleware/withZipline';
import { createToken, hashPassword } from 'lib/util';
import Logger from 'lib/logger';

async function handler(req: NextApiReq, res: NextApiRes) {
  const user = await req.user();
  if (!user) return res.forbid('not logged in');
  if (!user.administrator) return res.forbid('you arent an administrator');

  if (req.method !== 'POST') return res.status(405).end();

  const { username, password, administrator } = req.body as { username: string, password: string, administrator: boolean };

  if (!username) return res.bad('no username');
  if (!password) return res.bad('no auth');

  const existing = await prisma.user.findFirst({
    where: {
      username,
    },
  });
  if (existing) return res.forbid('user exists');

  const hashed = await hashPassword(password);

  const newUser = await prisma.user.create({
    data: {
      password: hashed,
      username,
      token: createToken(),
      administrator,
    },
  });

  delete newUser.password;

  Logger.get('user').info(`Created user ${newUser.username} (${newUser.id})`);

  return res.json(newUser);
}

export default withZipline(handler);