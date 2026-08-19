import { db, type Transaction } from '@/lib/db';
import { invites, users } from '@/lib/db/schema';
import { firstOrNull } from '@/lib/db/utils';
import { and, eq, gt, gte, inArray, isNotNull, isNull, lt, lte, or, sql } from 'drizzle-orm';
import { z } from 'zod';

const inviterColumns = {
  username: users.username,
  id: users.id,
  role: users.role,
};

function withInviter<TInvite extends typeof invites.$inferSelect>(
  row:
    | {
        invite: TInvite;
        inviter: { username: string; id: string; role: 'USER' | 'ADMIN' | 'SUPERADMIN' };
      }
    | undefined,
) {
  if (!row) return null;
  return { ...row.invite, inviter: row.inviter };
}

export async function findInviteByIdentifier(identifier: string) {
  const rows = await db
    .select({ invite: invites, inviter: inviterColumns })
    .from(invites)
    .innerJoin(users, eq(invites.inviterId, users.id))
    .where(or(eq(invites.id, identifier), eq(invites.code, identifier)))
    .limit(1);

  return withInviter(rows[0]);
}

export async function createInvite(input: {
  code: string;
  expiresAt: Date | null;
  maxUses: number | null;
  inviterId: string;
}) {
  return db.transaction(async (tx) => {
    const insertedRows = await tx.insert(invites).values(input).returning();
    const invite = insertedRows[0];
    if (!invite) throw new Error('Invite insert did not return a row');

    const inviterRows = await tx
      .select(inviterColumns)
      .from(users)
      .where(eq(users.id, input.inviterId))
      .limit(1);
    const inviter = inviterRows[0];
    if (!inviter) throw new Error(`Inviter ${input.inviterId} does not exist`);

    return { ...invite, inviter };
  });
}

export async function listInvites() {
  const rows = await db
    .select({ invite: invites, inviter: inviterColumns })
    .from(invites)
    .innerJoin(users, eq(invites.inviterId, users.id));

  return rows.map((row) => ({ ...row.invite, inviter: row.inviter }));
}

/** Deletes and returns the invite and its inviter, or null when no row was affected. */
export async function deleteInviteById(id: string) {
  return db.transaction(async (tx) => {
    const deletedRows = await tx.delete(invites).where(eq(invites.id, id)).returning();
    const invite = deletedRows[0];
    if (!invite) return null;

    const inviterRows = await tx
      .select(inviterColumns)
      .from(users)
      .where(eq(users.id, invite.inviterId))
      .limit(1);
    const inviter = inviterRows[0];
    if (!inviter) throw new Error(`Inviter ${invite.inviterId} does not exist`);

    return { ...invite, inviter };
  });
}

export async function findPublicInvite(identifier: string) {
  const rows = await db
    .select({
      code: invites.code,
      maxUses: invites.maxUses,
      uses: invites.uses,
      expiresAt: invites.expiresAt,
      inviter: { username: users.username },
    })
    .from(invites)
    .innerJoin(users, eq(invites.inviterId, users.id))
    .where(or(eq(invites.id, identifier), eq(invites.code, identifier)))
    .limit(1);

  return firstOrNull(rows);
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
  return db
    .select({ code: invites.code, id: invites.id, uses: invites.uses })
    .from(invites)
    .where(lte(invites.expiresAt, now));
}

export function findMaxUsedInvites() {
  return db
    .select()
    .from(invites)
    .where(and(isNotNull(invites.maxUses), gte(invites.uses, invites.maxUses)));
}

export async function deleteInvitesByIds(ids: string[]) {
  if (ids.length === 0) return 0;
  const rows = await db.delete(invites).where(inArray(invites.id, ids)).returning({ id: invites.id });
  return rows.length;
}

export const inviteSchema = z.object({
  id: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  expiresAt: z.date().nullable(),

  code: z.string(),
  uses: z.number(),
  maxUses: z.number().nullable(),

  inviterId: z.string(),

  inviter: z
    .object({
      username: z.string(),
      id: z.string(),
      role: z.enum(['USER', 'ADMIN', 'SUPERADMIN']),
    })
    .optional(),
});

export type Invite = z.infer<typeof inviteSchema>;
