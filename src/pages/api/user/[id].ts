import datasource from 'lib/datasource';
import Logger from 'lib/logger';
import prisma from 'lib/prisma';
import { hashPassword } from 'lib/util';
import { NextApiReq, NextApiRes, UserExtended, withZipline } from 'middleware/withZipline';

const logger = Logger.get('user');

async function handler(req: NextApiReq, res: NextApiRes, user: UserExtended) {
  const { id } = req.query as { id: string };

  const target = await prisma.user.findFirst({
    where: {
      id: Number(id),
    },
  });

  if (!target) return res.notFound('user not found');

  if (req.method === 'DELETE') {
    if (target.id === user.id) return res.badRequest("you can't delete your own account");
    if (target.administrator && !user.superAdmin) return res.forbidden('cannot delete administrator');

    const newTarget = await prisma.user.delete({
      where: { id: target.id },
    });

    logger.debug(`deleted user ${JSON.stringify(newTarget)}`);

    if (req.body.delete_files) {
      logger.debug(`attempting to delete ${newTarget.id}'s files`);

      const files = await prisma.image.findMany({
        where: {
          userId: newTarget.id,
        },
      });

      for (let i = 0; i !== files.length; ++i) {
        try {
          await datasource.delete(files[i].file);
        } catch {
          logger.debug(`failed to find file ${files[i].file} to delete`);
        }
      }

      const { count } = await prisma.image.deleteMany({
        where: {
          userId: newTarget.id,
        },
      });
      Logger.get('users').info(
        `User ${user.username} (${user.id}) deleted ${count} files of user ${newTarget.username} (${newTarget.id})`
      );
    }

    logger.info(`User ${user.username} (${user.id}) deleted user ${newTarget.username} (${newTarget.id})`);

    delete newTarget.password;

    return res.json(newTarget);
  } else if (req.method === 'PATCH') {
    if (target.administrator && !user.superAdmin) return res.forbidden('cannot modify administrator');

    logger.debug(`attempting to update user ${id} with ${JSON.stringify(req.body)}`);

    if (req.body.password) {
      const hashed = await hashPassword(req.body.password);
      await prisma.user.update({
        where: { id: target.id },
        data: { password: hashed },
      });
    }

    if (req.body.administrator) {
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

    if (req.body.embedTitle)
      await prisma.user.update({
        where: { id: target.id },
        data: { embedTitle: req.body.embedTitle },
      });

    if (req.body.embedColor)
      await prisma.user.update({
        where: { id: target.id },
        data: { embedColor: req.body.embedColor },
      });

    if (req.body.embedSiteName)
      await prisma.user.update({
        where: { id: target.id },
        data: { embedSiteName: req.body.embedSiteName },
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

    logger.debug(`updated user ${id} with ${JSON.stringify(newUser)}`);

    logger.info(
      `User ${user.username} (${user.id}) updated ${target.username} (${newUser.username}) (${newUser.id})`
    );

    delete newUser.password;
    return res.json(newUser);
  } else {
    delete target.password;

    return res.json(target);
  }
}

export default withZipline(handler, {
  methods: ['GET', 'DELETE', 'PATCH'],
  user: true,
  administrator: true,
});
