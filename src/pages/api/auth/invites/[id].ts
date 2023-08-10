import { prisma } from '@/lib/db';
import { Invite, inviteInviterSelect } from '@/lib/db/models/invite';
import { log } from '@/lib/logger';
import { combine } from '@/lib/middleware/combine';
import { method } from '@/lib/middleware/method';
import { ziplineAuth } from '@/lib/middleware/ziplineAuth';
import { NextApiReq, NextApiRes } from '@/lib/response';

export type ApiAuthInvitesIdResponse = Invite;

type Query = {
  id: string;
};

const logger = log('api').c('auth').c('invites').c('[id]');
async function handler(req: NextApiReq<any, Query>, res: NextApiRes<ApiAuthInvitesIdResponse>) {
  const { id } = req.query;

  const invite = await prisma.invite.findFirst({
    where: {
      OR: [{ id }, { code: id }],
    },
    include: {
      inviter: inviteInviterSelect,
    },
  });
  if (!invite) return res.notFound('Invite not found through id or code');

  if (req.method === 'DELETE') {
    const nInvite = await prisma.invite.delete({
      where: {
        id: invite.id,
      },
      include: {
        inviter: inviteInviterSelect,
      },
    });

    logger.info(`${req.user.username} deleted an invite`, {
      id: invite.id,
      code: invite.code,
    });

    return res.ok(nInvite);
  }

  return res.ok(invite);
}

export default combine([method(['GET', 'DELETE']), ziplineAuth({ administratorOnly: true })], handler);
