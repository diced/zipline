import datasource from 'lib/datasource';
import Logger from 'lib/logger';
import prisma from 'lib/prisma';
import { NextApiReq, NextApiRes, UserExtended, withZipline } from 'middleware/withZipline';

const logger = Logger.get('admin');

async function handler(req: NextApiReq, res: NextApiRes, user: UserExtended) {
  try {
    const { count } = await prisma.file.deleteMany({});
    logger.info(`User ${user.username} (${user.id}) cleared the database of ${count} files`);

    if (req.body.datasource) {
      await datasource.clear();
      logger.info(`User ${user.username} (${user.id}) cleared storage`);
    }
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
