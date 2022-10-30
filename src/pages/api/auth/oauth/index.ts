import prisma from 'lib/prisma';
import { NextApiReq, NextApiRes, withZipline } from 'lib/middleware/withZipline';

async function handler(req: NextApiReq, res: NextApiRes) {
  const user = await req.user();
  if (!user) return res.error('not logged in');

  if (req.method === 'DELETE') {
    if (!user.password)
      return res.forbid("can't unlink account without a password, please set one then unlink.");

    const nuser = await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        oauth: false,
        oauthProvider: null,
        oauthAccessToken: null,
      },
    });

    delete nuser.password;

    return res.json(nuser);
  } else {
    return res.json({
      enabled: user.oauth,
      provider: user.oauthProvider,
      access_token: user.oauthAccessToken,
    });
  }
}

export default withZipline(handler);
