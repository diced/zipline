import config from 'lib/config';
import Logger from 'lib/logger';
import prisma from 'lib/prisma';
import { checkPassword, createToken, hashPassword } from 'lib/util';
import { verify_totp_code } from 'lib/utils/totp';
import { NextApiReq, NextApiRes, withZipline } from 'middleware/withZipline';

async function handler(req: NextApiReq, res: NextApiRes) {
  const logger = Logger.get('login');

  const { username, password, code } = req.body as {
    username: string;
    password: string;
    code?: string;
  };

  const users = await prisma.user.count();
  if (users === 0) {
    logger.debug('no users found... creating default user...');
    await prisma.user.create({
      data: {
        username: 'administrator',
        password: await hashPassword('password'),
        token: createToken(),
        superAdmin: true,
        administrator: true,
      },
    });
    logger.info('created default user:\nUsername: "administrator"\nPassword: "password"');
  }

  const user = await prisma.user.findFirst({
    where: {
      username,
    },
  });

  if (!user) return res.notFound('user not found');

  let valid = false;
  if (user.token === password) valid = true;
  else if (await checkPassword(password, user.password)) valid = true;
  else valid = false;

  logger.debug(`body(${JSON.stringify(req.body)}): checkPassword(${password}, argon2-str) => ${valid}`);

  if (!valid) return res.unauthorized('Wrong password');

  if (user.totpSecret && config.mfa.totp_enabled) {
    if (!code) return res.unauthorized('TOTP required', { totp: true });

    const success = verify_totp_code(user.totpSecret, code);
    logger.debug(
      `body(${JSON.stringify(req.body)}): verify_totp_code(${user.totpSecret}, ${code}) => ${success}`,
    );
    if (!success) return res.badRequest('Invalid code', { totp: true });
  }

  await res.setUserCookie(user.uuid);
  logger.info(`User ${user.username} (${user.id}) logged in`);

  return res.json({ success: true });
}

export default withZipline(handler, {
  methods: ['POST'],
});
