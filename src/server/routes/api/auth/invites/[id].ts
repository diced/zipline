import { ApiError } from '@/lib/api/errors';
import { prisma } from '@/lib/db';
import { Invite, inviteInviterSelect, inviteSchema } from '@/lib/db/models/invite';
import { log } from '@/lib/logger';
import { Prisma } from '@/prisma/client';
import { administratorMiddleware } from '@/server/middleware/administrator';
import { userMiddleware } from '@/server/middleware/user';
import typedPlugin from '@/server/typedPlugin';
import z from 'zod';

export type ApiAuthInvitesIdResponse = Invite;
const logger = log('api').c('auth').c('invites').c('[id]');

const paramsSchema = z.object({
  id: z.string(),
});

export const PATH = '/api/auth/invites/:id';
export default typedPlugin(
  async (server) => {
    server.get(
      PATH,
      {
        schema: {
          description:
            'Fetch a specific invite by ID or code, including information about the inviter (admin only).',
          params: paramsSchema,
          response: {
            200: inviteSchema,
          },
        },
        preHandler: [userMiddleware, administratorMiddleware],
      },
      async (req, res) => {
        const { id } = req.params;

        const invite = await prisma.invite.findFirst({
          where: {
            OR: [{ id }, { code: id }],
          },
          include: {
            inviter: inviteInviterSelect,
          },
        });
        if (!invite) throw new ApiError(4005);

        return res.send(invite);
      },
    );

    server.delete(
      PATH,
      {
        schema: {
          description: 'Delete a specific invite by ID (admin only).',
          params: paramsSchema,
          response: {
            200: inviteSchema,
          },
        },
        preHandler: [userMiddleware, administratorMiddleware],
      },
      async (req, res) => {
        const { id } = req.params;

        try {
          const invite = await prisma.invite.delete({
            where: {
              id: id,
            },
            include: {
              inviter: inviteInviterSelect,
            },
          });

          logger.info(`${req.user.username} deleted an invite`, {
            id: invite.id,
            code: invite.code,
          });

          return res.send(invite);
        } catch (error) {
          if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
            throw new ApiError(4004);
          }

          logger.error(`Failed to delete invite with id ${id}`, { error });
          throw new ApiError(6000);
        }
      },
    );
  },
  { name: PATH },
);
