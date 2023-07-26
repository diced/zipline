import config from 'lib/config';
import prisma from 'lib/prisma';
import { NextApiReq, NextApiRes, withZipline } from 'middleware/withZipline';

async function handler(req: NextApiReq, res: NextApiRes) {
  const { code, username } = req.body as { code?: string; username?: string };

  if (!config.features.user_registration && !code) return res.badRequest('user registration is disabled');
  else if (!config.features.invites && code) return res.forbidden('user invites are disabled');

  if (config.features.invites && !code) return res.badRequest('no code');
  else if (config.features.invites && code) {
    const invite = await prisma.invite.findUnique({
      where: { code },
    });
    if (!invite) return res.badRequest('invalid invite code');
  }
  if (!username) return res.badRequest('no username');

  const user = await prisma.user.findFirst({
    where: { username },
    select: { id: true },
  });

  if (user) return res.badRequest('username already exists');
  return res.json({ success: true });
}

export default withZipline(handler, {
  methods: ['POST'],
});
