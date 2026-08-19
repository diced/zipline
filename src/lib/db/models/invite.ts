import { db, type Transaction } from '@/lib/db';
import { invites, users } from '@/lib/db/schema';
import { firstOrNull } from '@/lib/db/utils';
import { and, eq, gt, isNull, lt, or, sql } from 'drizzle-orm';
import { createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';

const inviterRelation = {
  columns: {
    username: true,
    id: true,
    role: true,
  },
} as const;

export async function createInvite(
  input: Pick<typeof invites.$inferInsert, 'code' | 'expiresAt' | 'maxUses' | 'inviterId'>,
) {
  return db.transaction(async (tx) => {
    const [invite] = await tx.insert(invites).values(input).returning({ id: invites.id });
    if (!invite) throw new Error('Invite insert did not return a row');

    const created = await tx.query.invites.findFirst({
      where: eq(invites.id, invite.id),
      with: { inviter: inviterRelation },
    });
    if (!created) throw new Error('Inserted invite could not be read back');
    return created;
  });
}

export async function removeInvite(id: string) {
  return db.transaction(async (tx) => {
    const invite = await tx.query.invites.findFirst({
      where: eq(invites.id, id),
      with: { inviter: inviterRelation },
    });
    if (!invite) return null;

    const [deleted] = await tx.delete(invites).where(eq(invites.id, id)).returning({ id: invites.id });
    return deleted ? invite : null;
  });
}

export async function consumeInvite(code: string, tx: Transaction) {
  const now = new Date();
  const rows = await tx
    .update(invites)
    .set({ uses: sql`${invites.uses} + 1` })
    .where(
      and(
        or(eq(invites.id, code), eq(invites.code, code)),
        or(isNull(invites.expiresAt), gt(invites.expiresAt, now)),
        or(isNull(invites.maxUses), lt(invites.uses, invites.maxUses)),
      ),
    )
    .returning({ id: invites.id });

  return firstOrNull(rows);
}

const inviterSchema = createSelectSchema(users).pick({
  username: true,
  id: true,
  role: true,
});

export const inviteSchema = createSelectSchema(invites).extend({ inviter: inviterSchema.optional() });

export type Invite = z.infer<typeof inviteSchema>;
