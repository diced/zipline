import prisma from 'lib/prisma';
import { hashPassword } from 'lib/util';
import { NextApiReq, NextApiRes, withZipline } from 'middleware/withZipline';
import Logger from 'lib/logger';

async function handler(req: NextApiReq, res: NextApiRes) {
  const user = await req.user();
  if (!user) return res.forbid('not logged in');

  if (req.method === 'PATCH') {
    if (req.body.password) {
      const hashed = await hashPassword(req.body.password);
      await prisma.user.update({
        where: { id: user.id },
        data: { password: hashed }
      });
    }

    if (req.body.username) await prisma.user.update({
      where: { id: user.id },
      data: { username: req.body.username }
    });

    if (req.body.embedTitle) await prisma.user.update({
      where: { id: user.id },
      data: { embedTitle: req.body.embedTitle }
    });

    if (req.body.embedColor) await prisma.user.update({
      where: { id: user.id },
      data: { embedColor: req.body.embedColor }
    });

    if (req.body.systemTheme) await prisma.user.update({
      where: { id: user.id },
      data: { systemTheme: req.body.systemTheme }
    });

    if (req.body.customTheme) {
      if (user.customTheme) await prisma.user.update({
        where: { id: user.id },
        data: {
          customTheme: {
            update: {
              ...req.body.customTheme
            }
          }
        }
      }); else await prisma.theme.create({
        data: {
          userId: user.id,
          ...req.body.customTheme
        }
      });
    }

    const newUser = await prisma.user.findFirst({
      where: {
        id: Number(user.id)
      },
      select: {
        administrator: true,
        embedColor: true,
        embedTitle: true,
        id: true,
        images: false,
        password: false,
        systemTheme: true,
        customTheme: true,
        token: true,
        username: true
      }
    });

    Logger.get('user').info(`User ${user.username} (${newUser.username}) (${newUser.id}) was updated`);

    return res.json(newUser);
  } else {
    delete user.password;

    return res.json(user);
  }
}

export default withZipline(handler);