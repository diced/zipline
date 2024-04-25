import { prisma } from '@/lib/db';
import { Invite, inviteInviterSelect } from '@/lib/db/models/invite';
import { log } from '@/lib/logger';
import { administratorMiddleware } from '@/server/middleware/administrator';
import { userMiddleware } from '@/server/middleware/user';
import fastifyPlugin from 'fastify-plugin';

export type ApiAuthInvitesIdResponse = Invite;

type Params = {
  id: string;
};

const logger = log('api').c('auth').c('invites').c('[id]');

export const PATH = '/api/auth/invites/:id';
export default fastifyPlugin(
  (server, _, done) => {
    server.route<{
      Body: Body;
      Params: Params;
    }>({
      url: PATH,
      method: ['GET', 'DELETE'],
      preHandler: [userMiddleware, administratorMiddleware],
      handler: async (req, res) => {
        const { id } = req.params;

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

          return res.send(nInvite);
        }

        return res.send(invite);
      },
    });

    done();
  },
  { name: PATH },
);
