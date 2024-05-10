import Logger from 'lib/logger';
import { NextApiReq, NextApiRes, UserExtended, withZipline } from 'middleware/withZipline';

async function handler(req: NextApiReq, res: NextApiRes, user: UserExtended) {
  await req.clearUser();

  Logger.get('user').info(`User ${user.username} (${user.id}) logged out`);

  return res.json({ success: true });
}

export default withZipline(handler, {
  methods: ['GET'],
  user: true,
});
