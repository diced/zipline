import { db } from '@/lib/db';
import { userPasskeys } from '@/lib/db/schema';
import { sql } from 'drizzle-orm';
import { createSelectSchema } from 'drizzle-zod';
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

export const userPasskeySchema = createSelectSchema(userPasskeys, { reg: z.unknown() });
export type UserPasskey = typeof userPasskeys.$inferSelect;

export async function getPasskeyByCredential(credentialId: string, client: DbClient = db) {
  return (
    (await client.query.userPasskeys.findFirst({
      where: sql`${userPasskeys.reg} #>> '{webauthn,id}' = ${credentialId}`,
    })) ?? null
  );
}
