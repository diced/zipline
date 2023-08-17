import { verifyPassword } from '@/lib/crypto';
import { prisma } from '@/lib/db';
import { User, userSelect } from '@/lib/db/models/user';
import { loginToken } from '@/lib/login';
import { combine } from '@/lib/middleware/combine';
import { method } from '@/lib/middleware/method';
import { NextApiReq, NextApiRes } from '@/lib/response';
import { verifyTotpCode } from '@/lib/totp';

export type ApiLoginResponse = {
  user?: User;
  token?: string;
  totp?: true;
};

type Body = {
  username: string;
  password: string;
  code?: string;
};

async function handler(req: NextApiReq<Body>, res: NextApiRes<ApiLoginResponse>) {
  const { username, password, code } = req.body;

  if (!username) return res.badRequest('Username is required');
  if (!password) return res.badRequest('Password is required');

  const user = await prisma.user.findUnique({
    where: {
      username,
    },
    select: {
      ...userSelect,
      password: true,
      token: true,
    },
  });
  if (!user) return res.badRequest('Invalid username', { username: true });

  if (!user.password) return res.badRequest('User does not have a password, login through a provider');
  const valid = await verifyPassword(password, user.password);
  if (!valid) return res.badRequest('Invalid password', { password: true });

  if (user.totpSecret && code) {
    const valid = verifyTotpCode(code, user.totpSecret);
    if (!valid) return res.badRequest('Invalid code', { code: true });
  }

  if (user.totpSecret && !code)
    return res.ok({
      totp: true,
    });

  const token = loginToken(res, user);

  delete (user as any).token;
  delete (user as any).password;

  return res.ok({
    token,
    user,
  });
}

export default combine([method(['POST'])], handler);
