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
  // handle invites
  if (!config.features.user_registration && !req.body.code)
    return res.badRequest('user registration is disabled');
  else if (req.body.code) {
    if (!config.features.invites && req.body.code) return res.badRequest('invites are disabled');

    const { code, username, password } = req.body as {
      code?: string;
      username: string;
      password: string;
    };
    const invite = await prisma.invite.findUnique({
      where: { code: code ?? '' },
    });
    if (!invite && code) return res.badRequest('invalid invite code');

    const user = await prisma.user.findFirst({
      where: { username },
    });

    if (user) return res.badRequest('username already exists');
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
        administrator: false,
        avatar,
      },
    });

    if (code) {
      await prisma.invite.update({
        where: {
          code,
        },
        data: {
          used: true,
        },
      });
    }

    logger.debug(`created user via invite ${code} ${JSON.stringify(newUser, jsonUserReplacer)}`);

    logger.info(
      `Created user ${newUser.username} (${newUser.id}) ${
        code ? `from invite code ${code}` : 'via registration'
      }`
    );

    return res.json({ success: true });
  }

  const user = await req.user();
  if (!user) return res.unauthorized('not logged in');
  if (!user.administrator) return res.forbidden('you arent an administrator');

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

  logger.debug(`created user ${JSON.stringify(newUser, jsonUserReplacer)}`);

  delete newUser.password;

  logger.info(`Created user ${newUser.username} (${newUser.id})`);

  return res.json(newUser);
}

export default withZipline(handler, {
  methods: ['POST'],
});
