import { NextApiReq, NextApiRes, withZipline } from 'middleware/withZipline';
import prisma from 'lib/prisma';
import Logger from 'lib/logger';
import datasource from 'lib/datasource';

async function handler(req: NextApiReq, res: NextApiRes) {
  if (req.method === 'POST' && req.body && req.body.code) {
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

  const user = await req.user();
  if (!user) return res.unauthorized('not logged in');
  if (!user.administrator) return res.forbidden('not an administrator');

  if (req.method === 'DELETE') {
    if (req.body.id === user.id) return res.badRequest("you can't delete your own account");

    const deleteUser = await prisma.user.findFirst({
      where: {
        id: req.body.id,
      },
    });
    if (!deleteUser) return res.notFound("user doesn't exist");

    if (req.body.delete_images) {
      const files = await prisma.image.findMany({
        where: {
          userId: deleteUser.id,
        },
      });

      for (let i = 0; i !== files.length; ++i) {
        try {
          await datasource.delete(files[i].file);
        } catch {}
      }

      const { count } = await prisma.image.deleteMany({
        where: {
          userId: deleteUser.id,
        },
      });
      Logger.get('users').info(
        `User ${user.username} (${user.id}) deleted ${count} files of user ${deleteUser.username} (${deleteUser.id})`
      );
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
        superAdmin: true,
        token: true,
        embedColor: true,
        embedTitle: true,
        systemTheme: true,
        avatar: true,
      },
    });
    return res.json(users);
  }
}

export default withZipline(handler, {
  methods: ['GET', 'POST', 'DELETE'],
});
