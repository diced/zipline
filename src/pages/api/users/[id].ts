import { hashPassword } from '@/lib/crypto';
import { datasource } from '@/lib/datasource';
import { prisma } from '@/lib/db';
import { User, userSelect } from '@/lib/db/models/user';
import { log } from '@/lib/logger';
import { combine } from '@/lib/middleware/combine';
import { method } from '@/lib/middleware/method';
import { ziplineAuth } from '@/lib/middleware/ziplineAuth';
import { NextApiReq, NextApiRes } from '@/lib/response';
import { canInteract } from '@/lib/role';
import { z } from 'zod';

export type ApiUsersIdResponse = User;

type Body = {
  username?: string;
  password?: string;
  avatar?: string;
  role?: 'USER' | 'ADMIN' | 'SUPERADMIN';

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
    const { username, password, avatar, role } = req.body;

    if (role && !z.enum(['USER', 'ADMIN']).safeParse(role).success)
      return res.badRequest('Invalid role (USER, ADMIN)');

    if (role && !canInteract(req.user.role, role)) return res.forbidden('You cannot create this role');

    const updatedUser = await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        ...(username && { username }),
        ...(password && { password: await hashPassword(password) }),
        ...(role !== undefined && { role: 'USER' }),
        ...(avatar && { avatar }),
      },
      select: userSelect,
    });

    logger.info(`${req.user.username} updated another user`, {
      username: updatedUser.username,
      role: updatedUser.role,
    });

    return res.ok(updatedUser);
  } else if (req.method === 'DELETE') {
    if (user.id === req.user.id) return res.forbidden('You cannot delete yourself');
    if (!canInteract(req.user.role, user.role)) return res.forbidden('You cannot delete this user');

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

    await prisma.oAuthProvider.deleteMany({
      where: {
        userId: user.id,
      },
    });

    const deletedUser = await prisma.user.delete({
      where: {
        id: user.id,
      },
      select: userSelect,
    });

    logger.info(`${req.user.username} deleted another user`, {
      username: deletedUser.username,
      role: deletedUser.role,
    });

    return res.ok(deletedUser);
  }

  return res.ok(user);
}

export default combine(
  [method(['GET', 'PATCH', 'DELETE']), ziplineAuth({ administratorOnly: true })],
  handler
);
