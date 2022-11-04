import prisma from 'lib/prisma';
import { NextApiReq, NextApiRes, withZipline } from 'middleware/withZipline';
import { checkPassword, createToken, hashPassword } from 'lib/util';
import Logger from 'lib/logger';

async function handler(req: NextApiReq, res: NextApiRes) {
  const { username, password } = req.body as {
    username: string;
    password: string;
  };

  const users = await prisma.user.findMany();
  if (users.length === 0) {
    Logger.get('database').info('no users found... creating default user...');
    await prisma.user.create({
      data: {
        username: 'administrator',
        password: await hashPassword('password'),
        token: createToken(),
        administrator: true,
      },
    });
    Logger.get('database').info('created default user:\nUsername: "administrator"\nPassword: "password"');
  }

  const user = await prisma.user.findFirst({
    where: {
      username,
    },
  });

  if (!user) return res.notFound('user not found');

  const valid = await checkPassword(password, user.password);
  if (!valid) return res.unauthorized('Wrong password');

  res.setUserCookie(user.id);
  Logger.get('user').info(`User ${user.username} (${user.id}) logged in`);

  return res.json({ success: true });
}

export default withZipline(handler, {
  methods: ['POST'],
});
