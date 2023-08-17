import { config } from '@/lib/config';
import { prisma } from '@/lib/db';
import { User } from '@/lib/db/models/user';
import { combine } from '@/lib/middleware/combine';
import { method } from '@/lib/middleware/method';
import { ziplineAuth } from '@/lib/middleware/ziplineAuth';
import { NextApiReq, NextApiRes } from '@/lib/response';
import { RegistrationResponseJSON } from '@github/webauthn-json/dist/types/browser-ponyfill';
import { Prisma } from '@prisma/client';

export type ApiUserMfaPasskeyResponse = User | User['passkeys'];
type Body = {
  reg?: RegistrationResponseJSON;
  name?: string;

  id?: string;
};

export async function handler(req: NextApiReq<Body>, res: NextApiRes<ApiUserMfaPasskeyResponse>) {
  if (!config.mfa.passkeys) return res.badRequest('Passkeys are not enabled');

  if (req.method === 'POST') {
    const { reg, name } = req.body;
    if (!reg) return res.badRequest('Missing webauthn response');
    if (!name) return res.badRequest('Missing name');

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        passkeys: {
          create: {
            name,
            reg: reg as unknown as Prisma.InputJsonValue,
            lastUsed: new Date(),
          },
        },
      },
    });

    return res.json(user);
  } else if (req.method === 'DELETE') {
    const { id } = req.body;
    if (!id) return res.badRequest('Missing id');

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        passkeys: {
          delete: { id },
        },
      },
    });

    return res.json(user);
  }

  return res.json(req.user.passkeys);
}

export default combine([method(['GET', 'POST']), ziplineAuth()], handler);
