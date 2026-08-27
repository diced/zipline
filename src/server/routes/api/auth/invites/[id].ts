import { ApiError } from '@/lib/api/errors';
import { db } from '@/lib/db';
import { Invite, inviteSchema } from '@/lib/db/models/invite';
import { invites } from '@/lib/db/schema';
import { log } from '@/lib/logger';
import { administratorMiddleware } from '@/server/middleware/administrator';
import { userMiddleware } from '@/server/middleware/user';
import typedPlugin from '@/server/typedPlugin';
import { eq } from 'drizzle-orm';
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
          tags: ['auth', 'admin'],
        },
        preHandler: [userMiddleware, administratorMiddleware],
      },
      async (req, res) => {
        const { id } = req.params;

        const invite = await db.query.invites.findFirst({
          where: { OR: [{ id }, { code: id }] },
          with: { inviter: { columns: { username: true, id: true, role: true } } },
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

        let invite;
        try {
          invite = await db.transaction(async (tx) => {
            const current = await tx.query.invites.findFirst({
              where: { id },
              with: { inviter: { columns: { username: true, id: true, role: true } } },
            });
            if (!current) return null;

            const [deleted] = await tx
              .delete(invites)
              .where(eq(invites.id, id))
              .returning({ id: invites.id });
            return deleted ? current : null;
          });
        } catch (error) {
          logger.error(`Failed to delete invite with id ${id}`, { error });
          throw new ApiError(6000);
        }

        if (!invite) throw new ApiError(4004);

        logger.info(`${req.user.username} deleted an invite`, {
          id: invite.id,
          code: invite.code,
        });

        return res.send(invite);
      },
    );
  },
  { name: PATH },
);
