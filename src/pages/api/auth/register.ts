import { readFile } from 'fs/promises';
import config from 'lib/config';
import Logger from 'lib/logger';
import { NextApiReq, NextApiRes, withZipline } from 'lib/middleware/withZipline';
import { guess } from 'lib/mimes';
import prisma from 'lib/prisma';
import { createToken, hashPassword } from 'lib/util';
import { jsonUserReplacer } from 'lib/utils/client';
import { extname } from 'path';

const logger = Logger.get('user');

async function handler(req: NextApiReq, res: NextApiRes) {
  if (!config.features.user_registration) return res.badRequest('user registration is disabled');

  const { username, password, administrator } = req.body as {
    username: string;
    password: string;
    administrator: boolean;
  };

  if (!username) return res.badRequest('no username');
  if (!password) return res.badRequest('no password');

  const existing = await prisma.user.findFirst({
    where: {
      username,
    },
  });
  if (existing) return res.badRequest('user exists');

  const hashed = await hashPassword(password);

  let avatar;
  if (config.features.default_avatar) {
    logger.debug(`using default avatar ${config.features.default_avatar}`);

    const buf = await readFile(config.features.default_avatar);
    const mimetype = await guess(extname(config.features.default_avatar));
    logger.debug(`guessed mimetype ${mimetype} for ${config.features.default_avatar}`);

    avatar = `data:${mimetype};base64,${buf.toString('base64')}`;
  }

  const newUser = await prisma.user.create({
    data: {
      password: hashed,
      username,
      token: createToken(),
      administrator,
      avatar,
    },
  });

  logger.debug(`registered user ${JSON.stringify(newUser, jsonUserReplacer)}`);

  delete newUser.password;

  logger.info(`User ${newUser.username} (${newUser.id}) registered`);

  return res.json(newUser);
}

export default withZipline(handler, {
  methods: ['POST'],
});
