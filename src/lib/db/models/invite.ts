import { db, type Transaction } from '@/lib/db';
import { invites, users } from '@/lib/db/schema';
import { firstOrNull } from '@/lib/db/utils';
import { and, eq, gt, gte, inArray, isNotNull, isNull, lt, lte, or, sql } from 'drizzle-orm';
import { createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';

const inviterRelation = {
  columns: {
    username: true,
    id: true,
    role: true,
  },
} as const;

export async function findInviteByIdentifier(identifier: string) {
  return (
    (await db.query.invites.findFirst({
      where: or(eq(invites.id, identifier), eq(invites.code, identifier)),
      with: { inviter: inviterRelation },
    })) ?? null
  );
}

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

export async function listInvites() {
  return db.query.invites.findMany({ with: { inviter: inviterRelation } });
}

/** Deletes and returns the invite and its inviter, or null when no row was affected. */
export async function deleteInviteById(id: string) {
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

export async function findPublicInvite(identifier: string) {
  return (
    (await db.query.invites.findFirst({
      columns: { code: true, maxUses: true, uses: true, expiresAt: true },
      where: or(eq(invites.id, identifier), eq(invites.code, identifier)),
      with: { inviter: { columns: { username: true } } },
    })) ?? null
  );
}

/** Atomically consumes a still-valid invite within the caller's registration transaction. */
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

export function findExpiredInvites(now = new Date()) {
  return db.query.invites.findMany({
    columns: { code: true, id: true, uses: true },
    where: lte(invites.expiresAt, now),
  });
}

export function findMaxUsedInvites() {
  return db.query.invites.findMany({
    where: and(isNotNull(invites.maxUses), gte(invites.uses, invites.maxUses)),
  });
}

export async function deleteInvitesByIds(ids: string[]) {
  if (ids.length === 0) return 0;
  const rows = await db.delete(invites).where(inArray(invites.id, ids)).returning({ id: invites.id });
  return rows.length;
}

const inviterSchema = createSelectSchema(users).pick({
  username: true,
  id: true,
  role: true,
});

export const inviteSchema = createSelectSchema(invites).extend({ inviter: inviterSchema.optional() });

export type Invite = z.infer<typeof inviteSchema>;
