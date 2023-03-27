import config from 'lib/config';
import prisma from 'lib/prisma';
import { NextApiReq, NextApiRes, withZipline } from 'middleware/withZipline';

async function handler(req: NextApiReq, res: NextApiRes) {
  if (!config.features.invites || !config.features.user_registration)
    return res.forbidden('user/invites are disabled');

  if (!req.body?.code) return res.badRequest('no code');
  if (!req.body?.username) return res.badRequest('no username');

  const { code, username } = req.body as { code: string; username: string };
  const invite = await prisma.invite.findUnique({
    where: { code },
  });
  if (!invite) return res.badRequest('invalid invite code');

  const user = await prisma.user.findFirst({
    where: { username },
  });

  if (user) return res.badRequest('username already exists');
  return res.json({ success: true });
}

export default withZipline(handler, {
  methods: ['POST'],
});
