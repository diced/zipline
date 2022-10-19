import prisma from 'lib/prisma';
import { NextApiReq, NextApiRes, withZipline } from 'lib/middleware/withZipline';
import { createToken, hashPassword } from 'lib/util';
import Logger from 'lib/logger';
import config from 'lib/config';
import { Limit } from '@prisma/client';

async function handler(req: NextApiReq, res: NextApiRes) {
  if (req.method === 'POST' && req.body && req.body.code) {
    if (!config.features.invites) return res.forbid('invites are disabled');

    const { code, username, password } = req.body as { code: string; username: string, password: string };
    const invite = await prisma.invite.findUnique({
      where: { code },
    });
    if (!invite) return res.bad('invalid invite code');
    
    const user = await prisma.user.findFirst({
      where: { username },
    });

    if (user) return res.bad('username already exists');
    const hashed = await hashPassword(password);
    const newUser = await prisma.user.create({
      data: {
        password: hashed,
        username,
        token: createToken(),
        administrator: false,
      },
    });

    await prisma.invite.update({
      where: {
        code,
      },
      data: {
        used: true,
      },
    });

    Logger.get('user').info(`Created user ${newUser.username} (${newUser.id}) from invite code ${code}`);

    return res.json({ success: true });
  }

  const user = await req.user();
  if (!user) return res.forbid('not logged in');
  if (!user.administrator) return res.forbid('you arent an administrator');

  if (req.method !== 'POST') return res.status(405).end();

  const { username, password, administrator, limits } = req.body as { username: string, password: string, administrator: boolean, limits: Limit };

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

  if (limits) {
    const data = {};
    const ends = ['type_time', 'limit_by', 'limit'];
    for (const [x, y] of Object.entries(limits)) {
      if (ends.includes(x)) data[x]=[y][0];
      else continue;
    };
    await prisma.user.update({
      where: {
        id: newUser.id,
      },
      data: {
        limit: {
          create: {
            ...data,
          },
        },
      },
    });
  }

  Logger.get('user').info(`Created user ${newUser.username} (${newUser.id})`);

  return res.json(newUser);
}

export default withZipline(handler);