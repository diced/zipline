import { config } from '@/lib/config';
import { randomCharacters } from '@/lib/crypto';
import { prisma } from '@/lib/db';
import { Invite, inviteInviterSelect } from '@/lib/db/models/invite';
import { log } from '@/lib/logger';
import { parseExpiry } from '@/lib/uploader/parseHeaders';
import { administratorMiddleware } from '@/server/middleware/administrator';
import { userMiddleware } from '@/server/middleware/user';
import fastifyPlugin from 'fastify-plugin';

export type ApiAuthInvitesResponse = Invite | Invite[];

type Body = {
  expiresAt: string;
  maxUses?: number;
};

const logger = log('api').c('auth').c('invites');

export const PATH = '/api/auth/invites';
export default fastifyPlugin(
  (server, _, done) => {
    server.route<{
      Body: Body;
    }>({
      url: PATH,
      method: ['GET', 'POST'],
      preHandler: [userMiddleware, administratorMiddleware],
      handler: async (req, res) => {
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

          return res.send(invite);
        }

        const invites = await prisma.invite.findMany({
          include: {
            inviter: inviteInviterSelect,
          },
        });

        return res.send(invites);
      },
    });

    done();
  },
  { name: PATH },
);
