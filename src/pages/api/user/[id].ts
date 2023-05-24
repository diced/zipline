import datasource from 'lib/datasource';
import Logger from 'lib/logger';
import prisma from 'lib/prisma';
import { hashPassword } from 'lib/util';
import { jsonUserReplacer } from 'lib/utils/client';
import { NextApiReq, NextApiRes, UserExtended, withZipline } from 'middleware/withZipline';

const logger = Logger.get('user');

async function handler(req: NextApiReq, res: NextApiRes, user: UserExtended) {
  const { id } = req.query as { id: string };

  const target = await prisma.user.findFirst({
    where: {
      id: Number(id),
    },
    include: {
      files: true,
      Folder: true,
    },
  });

  if (!target) return res.notFound('user not found');

  if (req.method === 'DELETE') {
    if (target.id === user.id) return res.badRequest("you can't delete your own account");
    if (target.administrator && !user.superAdmin) return res.forbidden('cannot delete administrator');
    const promises = [];

    promises.push(
      prisma.user.delete({
        where: { id: target.id },
      })
    );

    if (req.body.delete_files) {
      const files = await prisma.file.findMany({
        where: {
          userId: target.id,
        },
      });

      logger.debug(`attempting to delete ${target.id}'s files`);

      for (let i = 0; i !== files.length; ++i) {
        try {
          await datasource.delete(files[i].name);
        } catch {
          logger.debug(`failed to find file ${files[i].name} to delete`);
        }
      }

      promises.unshift(
        prisma.file.deleteMany({
          where: {
            userId: target.id,
          },
        })
      );
    }
    Promise.all(promises).then((promised) => {
      const newTarget = promised[1];
      const { count } = promised[0];
      logger.debug(`deleted user ${JSON.stringify(newTarget)}`);

      req.body.delete_files
        ? logger.info(
            `User ${user.username} (${user.id}) deleted ${count} files of user ${newTarget.username} (${newTarget.id})`
          )
        : logger.info(
            `User ${user.username} (${user.id}) deleted user ${newTarget.username} (${newTarget.id})`
          );

      delete newTarget.password;

      return res.json(newTarget);
    });
  } else if (req.method === 'PATCH') {
    if (
      (target.administrator && !user.superAdmin) ||
      (target.administrator && user.administrator && !user.superAdmin)
    )
      return res.forbidden('cannot modify administrator');

    logger.debug(`attempting to update user ${id} with ${JSON.stringify(req.body)}`);
    logger.debug(`user ${id} has ${!req.body.administrator} in administrator`);

    if (req.body.password) {
      const hashed = await hashPassword(req.body.password);
      await prisma.user.update({
        where: { id: target.id },
        data: { password: hashed },
      });
    }

    if (typeof req.body.administrator != 'undefined') {
      await prisma.user.update({
        where: { id: target.id },
        data: { administrator: req.body.administrator },
      });
    }

    if (req.body.username) {
      const existing = await prisma.user.findFirst({
        where: {
          username: req.body.username,
        },
      });
      if (existing && user.username !== req.body.username) {
        return res.badRequest('username is already taken');
      }
      await prisma.user.update({
        where: { id: target.id },
        data: { username: req.body.username },
      });
    }

    if (req.body.avatar)
      await prisma.user.update({
        where: { id: target.id },
        data: { avatar: req.body.avatar },
      });

    if (req.body.embed)
      await prisma.user.update({
        where: { id: target.id },
        data: { embed: req.body.embed },
      });

    if (req.body.systemTheme)
      await prisma.user.update({
        where: { id: target.id },
        data: { systemTheme: req.body.systemTheme },
      });

    if (req.body.domains) {
      if (!req.body.domains)
        await prisma.user.update({
          where: { id: target.id },
          data: { domains: [] },
        });

      const invalidDomains = [];
      const domains = [];

      for (const domain of req.body.domains) {
        try {
          const url = new URL(domain);
          domains.push(url.origin);
        } catch (e) {
          invalidDomains.push({ domain, reason: e.message });
        }
      }

      if (invalidDomains.length) return res.badRequest('invalid domains', { invalidDomains });

      await prisma.user.update({
        where: { id: target.id },
        data: { domains },
      });

      return res.json({ domains });
    }

    const newUser = await prisma.user.findFirst({
      where: {
        id: target.id,
      },
    });

    logger.debug(`updated user ${id} with ${JSON.stringify(newUser, jsonUserReplacer)}`);

    logger.info(
      `User ${user.username} (${user.id}) updated ${target.username} (${newUser.username}) (${newUser.id})`
    );

    delete newUser.password;
    return res.json(newUser);
  } else {
    delete target.password;

    if ((user.superAdmin || user.administrator) && (target.administrator || target.superAdmin))
      delete target.files;

    return res.json(target);
  }
}

export default withZipline(handler, {
  methods: ['GET', 'DELETE', 'PATCH'],
  user: true,
  administrator: true,
});

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '50mb',
    },
  },
};
