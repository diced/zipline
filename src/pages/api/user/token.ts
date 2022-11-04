import { NextApiReq, NextApiRes, UserExtended, withZipline } from 'middleware/withZipline';
import prisma from 'lib/prisma';
import { createToken } from 'lib/util';
import Logger from 'lib/logger';

async function handler(req: NextApiReq, res: NextApiRes, user: UserExtended) {
  const updated = await prisma.user.update({
    where: {
      id: user.id,
    },
    data: {
      token: createToken(),
    },
  });

  Logger.get('user').info(`User ${user.username} (${user.id}) reset their token`);

  return res.json({ success: updated.token });
}

export default withZipline(handler, {
  methods: ['PATCH'],
  user: true,
});
