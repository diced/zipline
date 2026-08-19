import { db } from '@/lib/db';
import { userPasskeys } from '@/lib/db/schema';
import { and, eq, sql } from 'drizzle-orm';
import type { PgUpdateSetSource } from 'drizzle-orm/pg-core';
import { z } from 'zod';
import type { DbClient } from './user';

const byteSchema = z.number().int().min(0).max(255);

export const passkeyRegSchema = z.object({
  webauthn: z.object({
    webAuthnUserID: z.string(),
    id: z.string(),
    publicKey: z.union([
      z.string(),
      z.array(byteSchema),
      z.record(z.string(), byteSchema),
      z.object({ $type: z.literal('Bytes'), value: z.string() }),
      z.object({ type: z.literal('Buffer'), data: z.array(byteSchema) }),
    ]),
    counter: z.number(),
    transports: z.array(z.string()).optional(),
    deviceType: z.string().optional(),
    backedUp: z.boolean().optional(),
  }),
});

export type PasskeyReg = z.infer<typeof passkeyRegSchema>;

export type PasskeyRow = typeof userPasskeys.$inferSelect;
export type PasskeyInsert = typeof userPasskeys.$inferInsert;
export type PasskeyUpdate = Omit<
  PgUpdateSetSource<typeof userPasskeys>,
  'id' | 'userId' | 'createdAt' | 'updatedAt'
>;

export async function listUserPasskeys(userId: string, client: DbClient = db) {
  return client.query.userPasskeys.findMany({ where: eq(userPasskeys.userId, userId) });
}

export async function findPasskeyByCredentialId(credentialId: string, client: DbClient = db) {
  return (
    (await client.query.userPasskeys.findFirst({
      where: sql`${userPasskeys.reg} #>> '{webauthn,id}' = ${credentialId}`,
    })) ?? null
  );
}

export async function createUserPasskey(data: PasskeyInsert, client: DbClient = db) {
  const rows = await client.insert(userPasskeys).values(data).returning();
  if (!rows[0]) throw new Error('Passkey insert did not return a row');
  return rows[0];
}

export async function updateUserPasskey(id: string, data: PasskeyUpdate, client: DbClient = db) {
  const rows = await client.update(userPasskeys).set(data).where(eq(userPasskeys.id, id)).returning();
  return rows[0] ?? null;
}

export async function deleteUserPasskey(userId: string, id: string, client: DbClient = db) {
  const rows = await client
    .delete(userPasskeys)
    .where(and(eq(userPasskeys.userId, userId), eq(userPasskeys.id, id)))
    .returning();
  return rows[0] ?? null;
}
