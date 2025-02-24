import Logger from 'lib/logger';
import prisma from 'lib/prisma';
import { NextApiReq, NextApiRes, UserExtended, withZipline } from 'middleware/withZipline';

const logger = Logger.get('admin');

async function handler(req: NextApiReq, res: NextApiRes, user: UserExtended) {
  try {
    const { orphaned } = req.body;
    if (orphaned) {
      const files = await prisma.file.findMany({
        where: {
          userId: null,
        },
      });
      const { count } = await prisma.file.deleteMany({
        where: {
          userId: null,
        },
      });
      for (const file of files) await datasource.delete(file.name);
      logger.info(`User ${user.username} (${user.id}) cleared the database of ${count} orphaned files`);
      return res.json({ message: 'cleared storage (orphaned only)' });
    }
    const { count } = await prisma.file.deleteMany({});
    await datasource.clear();
    logger.info(`User ${user.username} (${user.id}) cleared the database of ${count} files`);
  } catch (e) {
    logger.error(`User ${user.username} (${user.id}) failed to clear the database or storage`);
    logger.error(e);
    return res.badRequest(`failed to clear the database or storage: ${e}`);
  }

  return res.json({ message: 'cleared storage' });
}

export default withZipline(handler, {
  methods: ['POST'],
  user: true,
  administrator: true,
});
