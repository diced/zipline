import prisma from 'lib/prisma';
import { NextApiReq, NextApiRes, withZipline } from 'lib/middleware/withZipline';
import { randomChars } from 'lib/util';
import Logger from 'lib/logger';
import config from 'lib/config';

async function handler(req: NextApiReq, res: NextApiRes) {
  if (!config.features.invites) return res.forbid('invites are disabled');
  
  const user = await req.user();
  if (!user) return res.forbid('not logged in');
  if (!user.administrator) return res.forbid('you arent an administrator');

  if (req.method === 'POST') {
    const { expires_at } = req.body as { expires_at: string };

    const expiry = expires_at ? new Date(expires_at) : null;
    if (expiry) {
      if (!expiry.getTime()) return res.bad('invalid date');
      if (expiry.getTime() < Date.now()) return res.bad('date is in the past');
    }

    const code = randomChars(6);
    
    const invite = await prisma.invite.create({
      data: {
        code,
        createdById: user.id,
        expires_at: expiry,
      },
    });

    Logger.get('invite').info(`${user.username} (${user.id}) created invite ${invite.code}`);

    return res.json(invite);
  } else if (req.method === 'GET') {
    const invites = await prisma.invite.findMany({
      orderBy: {
        created_at: 'desc',
      },
    });

    return res.json(invites);
  } else if (req.method === 'DELETE') {
    const { code } = req.query as { code: string };

    const invite = await prisma.invite.delete({
      where: {
        code,
      },
    });

    Logger.get('invite').info(`${user.username} (${user.id}) deleted invite ${invite.code}`);

    return res.json(invite);
  }
}

export default withZipline(handler);