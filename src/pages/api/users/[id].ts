import { hashPassword } from '@/lib/crypto';
import { datasource } from '@/lib/datasource';
import { prisma } from '@/lib/db';
import { User, userSelect } from '@/lib/db/models/user';
import { log } from '@/lib/logger';
import { combine } from '@/lib/middleware/combine';
import { method } from '@/lib/middleware/method';
import { ziplineAuth } from '@/lib/middleware/ziplineAuth';
import { NextApiReq, NextApiRes } from '@/lib/response';

export type ApiUsersIdResponse = User;

type Body = {
  username?: string;
  password?: string;
  avatar?: string;
  administrator?: boolean;

  delete?: boolean;
};

type Query = {
  id: string;
};

const logger = log('api').c('users').c('[id]');

export async function handler(req: NextApiReq<Body, Query>, res: NextApiRes<ApiUsersIdResponse>) {
  const user = await prisma.user.findUnique({
    where: {
      id: req.query.id,
    },
    select: userSelect,
  });
  if (!user) return res.notFound('User not found');

  if (req.method === 'PATCH') {
    const { username, password, avatar, administrator } = req.body;

    const updatedUser = await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        ...(username && { username }),
        ...(password && { password: await hashPassword(password) }),
        ...(administrator !== undefined && { administrator }),
        ...(avatar && { avatar }),
      },
      select: userSelect,
    });

    logger.info(`${req.user.username} updated another user`, {
      username: updatedUser.username,
      administrator: updatedUser.administrator,
    });

    return res.ok(updatedUser);
  } else if (req.method === 'DELETE') {
    if (user.id === req.user.id) return res.forbidden('You cannot delete yourself');

    if (req.body.delete) {
      const files = await prisma.file.findMany({
        where: {
          userId: user.id,
        },
        select: {
          name: true,
        },
      });

      const [{ count: filesDeleted }, { count: urlsDeleted }] = await prisma.$transaction([
        prisma.file.deleteMany({
          where: {
            userId: user.id,
          },
        }),
        prisma.url.deleteMany({
          where: {
            userId: user.id,
          },
        }),
      ]);

      logger.debug(`preparing to delete ${files.length} files from datasource`, {
        username: user.username,
      });

      for (let i = 0; i !== files.length; ++i) {
        await datasource.delete(files[i].name);
      }

      logger.info(`${req.user.username} deleted another user's files & urls`, {
        username: user.username,
        deletedFiles: filesDeleted,
        deletedUrls: urlsDeleted,
      });
    }

    const deletedUser = await prisma.user.delete({
      where: {
        id: user.id,
      },
      select: userSelect,
    });

    logger.info(`${req.user.username} deleted another user`, {
      username: deletedUser.username,
      administrator: deletedUser.administrator,
    });

    return res.ok(deletedUser);
  }

  return res.ok(user);
}

export default combine(
  [method(['GET', 'PATCH', 'DELETE']), ziplineAuth({ administratorOnly: true })],
  handler
);
