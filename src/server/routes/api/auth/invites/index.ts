import { config } from '@/lib/config';
import { db } from '@/lib/db';
import { Invite, inviteSchema } from '@/lib/db/models/invite';
import { invites } from '@/lib/db/schema';
import { log } from '@/lib/logger';
import { randomCharacters } from '@/lib/random';
import { secondlyRatelimit } from '@/lib/ratelimits';
import { parseExpiry } from '@/lib/uploader/parseHeaders';
import { administratorMiddleware } from '@/server/middleware/administrator';
import { userMiddleware } from '@/server/middleware/user';
import typedPlugin from '@/server/typedPlugin';
import z from 'zod';

export type ApiAuthInvitesResponse = Invite | Invite[];

const logger = log('api').c('auth').c('invites');

export const PATH = '/api/auth/invites';
export default typedPlugin(
  async (server) => {
    server.post(
      PATH,
      {
        schema: {
          description:
            'Create a new invite code for user registration, optionally limiting uses and expiration (admin only).',
          body: z.object({
            expiresAt: z
              .string()
              .or(z.literal('never'))
              .transform((val) => parseExpiry(val)),
            maxUses: z.number().min(1).optional(),
          }),
          response: {
            200: inviteSchema,
          },
          tags: ['auth', 'admin'],
        },
        preHandler: [userMiddleware, administratorMiddleware],
        ...secondlyRatelimit(1),
      },
      async (req, res) => {
        const { expiresAt, maxUses } = req.body;

        const invite = await db.transaction(async (tx) => {
          const [created] = await tx
            .insert(invites)
            .values({
              code: randomCharacters(config.invites.length),
              expiresAt,
              maxUses: maxUses ?? null,
              inviterId: req.user.id,
            })
            .returning({ id: invites.id });
          if (!created) throw new Error('Invite insert did not return a row');

          const invite = await tx.query.invites.findFirst({
            where: { id: created.id },
            with: { inviter: { columns: { username: true, id: true, role: true } } },
          });
          if (!invite) throw new Error('Inserted invite could not be read back');
          return invite;
        });

        logger.info(`${req.user.username} created an invite`, {
          maxUses,
          expiresAt,
          code: invite.code,
        });

        return res.send(invite);
      },
    );

    server.get(
      PATH,
      {
        schema: {
          description: 'List all existing invite codes and their metadata (admin only).',
          response: {
            200: z.array(inviteSchema),
          },
        },
        preHandler: [userMiddleware, administratorMiddleware],
      },
      async (_, res) => {
        const list = await db.query.invites.findMany({
          with: { inviter: { columns: { username: true, id: true, role: true } } },
        });

        return res.send(list);
      },
    );
  },
  { name: PATH },
);
