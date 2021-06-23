import { NextApiReq, NextApiRes, withZipline } from 'middleware/withZipline';
import Logger from 'lib/logger';

async function handler(req: NextApiReq, res: NextApiRes) {
  const user = await req.user();
  if (!user) return res.forbid('not logged in');

  req.cleanCookie('user');

  Logger.get('user').info(`User ${user.username} (${user.id}) logged out`);

  return res.json({ success: true });
}

export default withZipline(handler);