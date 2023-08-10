import { config } from '@/lib/config';
import { randomCharacters } from '@/lib/crypto';
import { prisma } from '@/lib/db';
import { Invite, inviteInviterSelect } from '@/lib/db/models/invite';
import { log } from '@/lib/logger';
import { combine } from '@/lib/middleware/combine';
import { method } from '@/lib/middleware/method';
import { ziplineAuth } from '@/lib/middleware/ziplineAuth';
import { NextApiReq, NextApiRes } from '@/lib/response';
import { parseExpiry } from '@/lib/uploader/parseHeaders';

export type ApiAuthInvitesResponse = Invite | Invite[];

type Body = {
  expiresAt: string;
  maxUses?: number;
};

const logger = log('api').c('auth').c('invites');
async function handler(req: NextApiReq<Body>, res: NextApiRes<ApiAuthInvitesResponse>) {
  if (req.method === 'POST') {
    const { expiresAt, maxUses } = req.body;

    if (!expiresAt) return res.badRequest('expiresAt is required');
    let expires = null;

    if (expiresAt !== 'never') expires = parseExpiry(expiresAt);

    const invite = await prisma.invite.create({
      data: {
        code: randomCharacters(config.invites.length),
        expiresAt: expires,
        maxUses: maxUses ?? null,
        inviterId: req.user.id,
      },
      include: {
        inviter: inviteInviterSelect,
      },
    });

    logger.info(`${req.user.username} created an invite`, {
      maxUses,
      expiresAt,
      code: invite.code,
    });

    return res.ok(invite);
  }

  const invites = await prisma.invite.findMany({
    include: {
      inviter: inviteInviterSelect,
    },
  });

  return res.ok(invites);
}

export default combine([method(['GET', 'POST']), ziplineAuth({ administratorOnly: true })], handler);
