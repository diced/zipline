import { config } from '@/lib/config';
import { prisma } from '@/lib/db';
import { User, userSelect } from '@/lib/db/models/user';
import { loginToken } from '@/lib/login';
import { combine } from '@/lib/middleware/combine';
import { method } from '@/lib/middleware/method';
import { NextApiReq, NextApiRes } from '@/lib/response';
import { AuthenticationResponseJSON } from '@github/webauthn-json/dist/types/browser-ponyfill';

export type ApiAuthWebauthnResponse = {
  user: User;
  token: string;
};

type Body = {
  auth: AuthenticationResponseJSON;
};

async function handler(req: NextApiReq<Body>, res: NextApiRes<ApiAuthWebauthnResponse>) {
  if (!config.mfa.passkeys) return res.badRequest('Passkeys are not enabled');

  const { auth } = req.body;
  if (!auth) return res.badRequest('Missing webauthn payload');

  const user = await prisma.user.findFirst({
    where: {
      passkeys: {
        some: {
          reg: {
            path: ['id'],
            equals: auth.id,
          },
        },
      },
    },
    select: {
      ...userSelect,
      password: true,
      token: true,
    },
  });
  if (!user) return res.badRequest('Invalid passkey');

  const token = loginToken(res, user);

  delete (user as any).token;
  delete (user as any).password;

  await prisma.userPasskey.updateMany({
    where: {
      reg: {
        path: ['id'],
        equals: auth.id,
      },
    },
    data: {
      lastUsed: new Date(),
    },
  });

  return res.ok({
    token,
    user,
  });
}

export default combine([method(['POST'])], handler);
