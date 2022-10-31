import prisma from 'lib/prisma';
import { NextApiReq, NextApiRes, withZipline } from 'lib/middleware/withZipline';
import { OauthProviders } from '@prisma/client';

async function handler(req: NextApiReq, res: NextApiRes) {
  const user = await req.user();
  if (!user) return res.error('not logged in');

  if (req.method === 'DELETE') {
    if (!user.password && user.oauth.length === 1)
      return res.forbid("can't unlink account without a password, please set one then unlink.");

    const { provider } = req.body as { provider: OauthProviders };

    if (!provider) {
      const nuser = await prisma.user.update({
        where: { id: user.id },
        data: {
          oauth: {
            deleteMany: {},
          },
        },
      });

      delete nuser.password;

      return res.json(nuser);
    }
    const nuser = await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        oauth: {
          deleteMany: [{ provider }],
        },
      },
      include: {
        oauth: true,
      },
    });

    delete nuser.password;

    return res.json(nuser);
  } else {
    return res.json(user.oauth);
  }
}

export default withZipline(handler);
