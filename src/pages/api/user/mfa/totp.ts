import { config } from '@/lib/config';
import { prisma } from '@/lib/db';
import { User, userSelect } from '@/lib/db/models/user';
import { combine } from '@/lib/middleware/combine';
import { method } from '@/lib/middleware/method';
import { ziplineAuth } from '@/lib/middleware/ziplineAuth';
import { NextApiReq, NextApiRes } from '@/lib/response';
import { generateKey, totpQrcode, verifyTotpCode } from '@/lib/totp';

export type ApiUserMfaTotpResponse = User | { secret: string } | { secret: string; qrcode: string };

type Body = {
  code?: string;
  secret?: string;
};

export async function handler(req: NextApiReq<Body>, res: NextApiRes<ApiUserMfaTotpResponse>) {
  if (!config.mfa.totp.enabled) return res.badRequest('TOTP is disabled');

  if (req.method === 'DELETE') {
    if (!req.user.totpSecret) return res.badRequest("You don't have TOTP enabled");

    const { code } = req.body;
    if (!code) return res.badRequest('Missing code');
    if (code.length !== 6) return res.badRequest('Invalid code');

    const valid = verifyTotpCode(code, req.user.totpSecret);
    if (!valid) return res.badRequest('Invalid code');

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { totpSecret: null },
      select: userSelect,
    });

    return res.json(user);
  } else if (req.method === 'POST') {
    const { code, secret } = req.body;
    if (!code) return res.badRequest('Missing code');
    if (code.length !== 6) return res.badRequest('Invalid code');

    if (!secret) return res.badRequest('Missing secret');

    const valid = verifyTotpCode(code, secret);
    if (!valid) return res.badRequest('Invalid code');

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { totpSecret: secret },
      select: userSelect,
    });

    return res.json(user);
  }

  if (!req.user.totpSecret) {
    const secret = generateKey();
    const qrcode = await totpQrcode({
      issuer: config.mfa.totp.issuer,
      username: req.user.username,
      secret,
    });

    return res.json({
      secret,
      qrcode,
    });
  }

  return res.json({
    secret: req.user.totpSecret,
  });
}

export default combine([method(['GET', 'POST', 'DELETE']), ziplineAuth()], handler);
