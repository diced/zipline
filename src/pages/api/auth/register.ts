import { config } from '@/lib/config';
import { createToken, hashPassword } from '@/lib/crypto';
import { prisma } from '@/lib/db';
import { userSelect } from '@/lib/db/models/user';
import { loginToken } from '@/lib/login';
import { combine } from '@/lib/middleware/combine';
import { method } from '@/lib/middleware/method';
import { NextApiReq, NextApiRes } from '@/lib/response';
import { ApiLoginResponse } from './login';
import { log } from '@/lib/logger';

export type ApiAuthRegisterResponse = ApiLoginResponse;

type Body = {
  username: string;
  password: string;
  code?: string;
};

const logger = log('api').c('auth').c('register');
async function handler(req: NextApiReq<Body>, res: NextApiRes<ApiAuthRegisterResponse>) {
  const { username, password, code } = req.body;

  if (code && !config.invites.enabled) return res.badRequest("Invites aren't enabled");
  if (!code && !config.features.userRegistration) return res.badRequest('User registration is disabled');

  if (!username) return res.badRequest('Username is required');
  if (!password) return res.badRequest('Password is required');

  const oUser = await prisma.user.findUnique({
    where: {
      username,
    },
  });
  if (oUser) return res.badRequest('Username is taken', { username: true });

  if (code) {
    const invite = await prisma.invite.findFirst({
      where: {
        OR: [{ id: code }, { code }],
      },
    });

    if (!invite) return res.badRequest('Invalid invite code');
    if (invite.expiresAt && new Date(invite.expiresAt) < new Date())
      return res.badRequest('Invalid invite code', { expired: true });
    if (invite.maxUses && invite.uses >= invite.maxUses)
      return res.badRequest('Invalid invite code', { uses: true });

    await prisma.invite.update({
      where: {
        id: invite.id,
      },
      data: {
        uses: invite.uses + 1,
      },
    });
  }

  const user = await prisma.user.create({
    data: {
      username,
      password: await hashPassword(password),
      role: 'USER',
      token: createToken(),
    },
    select: {
      ...userSelect,
      password: true,
      token: true,
    }
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
