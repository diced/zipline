import config from 'lib/config';
import Logger from 'lib/logger';
import prisma from 'lib/prisma';
import { generate_totp_secret, totp_qrcode, verify_totp_code } from 'lib/utils/totp';
import { NextApiReq, NextApiRes, UserExtended, withZipline } from 'middleware/withZipline';

const logger = Logger.get('user::mfa::totp');

async function handler(req: NextApiReq, res: NextApiRes, user: UserExtended) {
  if (!config.mfa.totp_enabled) return res.forbidden('totp is disabled');

  if (req.method === 'POST') {
    const { secret, code } = req.body as { secret: string; code: string };

    if (!secret) return res.badRequest('no secret');
    if (!code) return res.badRequest('no code');

    if (code.length !== 6) return res.badRequest('invalid code (code.length != 6)');

    const success = verify_totp_code(secret, code);
    logger.debug(`body(${JSON.stringify(req.body)}): verify_totp_code(${secret}, ${code}) => ${success}`);

    if (!success) return res.badRequest('Invalid code');
    if (user.totpSecret) return res.badRequest('totp already registered');

    logger.debug(`registering totp(${secret}) ${user.id}`);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        totpSecret: secret,
      },
    });

    delete user.password;
    return res.json(user);
  } else if (req.method === 'DELETE') {
    const { code } = req.body as { code: string };

    if (!code) return res.badRequest('no code');
    if (code.length !== 6) return res.badRequest('invalid code (code.length != 6)');

    const success = verify_totp_code(user.totpSecret, req.body.code);

    logger.debug(
      `body(${JSON.stringify(req.body)}): verify_totp_code(${user.totpSecret}, ${
        req.body.code
      }) => ${success}`
    );

    if (!success) return res.badRequest('Invalid code');

    logger.debug(`unregistering totp ${user.id}`);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        totpSecret: null,
      },
    });

    delete user.password;
    return res.json(user);
  } else {
    if (!user.totpSecret) {
      const secret = generate_totp_secret();
      const data_url = await totp_qrcode(config.mfa.totp_issuer, user.username, secret);

      return res.json({
        secret,
        data_url,
      });
    }

    return res.json({
      secret: user.totpSecret,
    });
  }
}

export default withZipline(handler, {
  methods: ['GET', 'POST', 'DELETE'],
  user: true,
});
