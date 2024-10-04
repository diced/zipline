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
const MAX_USERNAME_LENGTH = 12;

async function handler(req: NextApiReq, res: NextApiRes) {
  const user = await req.user();
  let badRequest,
    usedInvite = false;

  if (!config.features.user_registration && !config.features.invites && !user?.administrator)
    return res.badRequest('This endpoint is unavailable due to current configurations');
  else if (!!user && !user?.administrator) return res.badRequest('Already logged in');

  const { username, password, administrator, code } = req.body as {
    username: string;
    password: string;
    administrator: boolean;
    code?: string;
  };

  if (!username || !password) return res.badRequest('Bad Username/Password');

  // Validate username length
  if (username.length > MAX_USERNAME_LENGTH) {
    return res.badRequest(`Username cannot exceed ${MAX_USERNAME_LENGTH} characters`);
  }

  const existing = await prisma.user.findFirst({
    where: { username },
    select: { username: true },
  });

  if (existing) return res.badRequest('Bad Username/Password');

  if (code) {
    if (config.features.invites) {
      const invite = await prisma.invite.findUnique({
        where: { code },
      });

      if (!invite || invite?.used) return res.badRequest('Bad invite');
      usedInvite = true;
    } else return res.badRequest('Bad Username/Password');
  } else if (config.features.invites && !user?.administrator) {
    return res.badRequest('Bad invite');
  }

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
      administrator: user?.superAdmin ? administrator : false,
      avatar,
    },
  });

  if (usedInvite)
    await prisma.invite.update({
      where: { code },
      data: { used: true },
    });

  logger.debug(
    `registered user${usedInvite ? ' via invite ' + code : ''} ${JSON.stringify(newUser, jsonUserReplacer)}`
  );

  delete newUser.password;

  logger.info(`User ${newUser.username} (${newUser.id}) registered`);

  return res.json(newUser);
}

export default withZipline(handler, {
  methods: ['POST'],
});
