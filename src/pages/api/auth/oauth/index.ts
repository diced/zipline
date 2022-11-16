import { OauthProviders } from '@prisma/client';
import { NextApiReq, NextApiRes, UserExtended, withZipline } from 'lib/middleware/withZipline';
import prisma from 'lib/prisma';

async function handler(req: NextApiReq, res: NextApiRes, user: UserExtended) {
  if (req.method === 'DELETE') {
    if (!user.password && user.oauth?.length === 1)
      return res.badRequest("can't unlink account without a password, please set one then unlink.");

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
    return res.json(user.oauth ?? []);
  }
}

export default withZipline(handler, {
  methods: ['DELETE', 'GET'],
  user: true,
});
