import { NextApiReq, NextApiRes, withZipline } from 'middleware/withZipline';
import prisma from 'lib/prisma';
import Logger from 'lib/logger';

async function handler(req: NextApiReq, res: NextApiRes) {
  const user = await req.user();
  if (!user) return res.forbid('not logged in');
  if (!user.administrator) return res.forbid('you aren\'t an administrator');

  if (req.method === 'DELETE') {
    if (req.body.id === user.id) return res.forbid('you can\'t delete your own account');
    
    const deleteUser = await prisma.user.findFirst({
      where: {
        id: req.body.id,
      },
    });
    if (!deleteUser) return res.forbid('user doesn\'t exist');

    if (req.body.delete_images) {
      const { count } = await prisma.image.deleteMany({
        where: {
          userId: deleteUser.id,
        },
      });
      Logger.get('image').info(`User ${user.username} (${user.id}) deleted ${count} images of user ${deleteUser.username} (${deleteUser.id})`);
    }

    await prisma.user.delete({
      where: {
        id: deleteUser.id,
      },
    });

    delete deleteUser.password;
    return res.json(deleteUser);
  } else {
    const users = await prisma.user.findMany({
      select: {
        username: true,
        id: true,
        administrator: true,
        token: true,
        embedColor: true,
        embedTitle: true,
        systemTheme: true,
      },
    });
    return res.json(users);
  }
}

export default withZipline(handler);