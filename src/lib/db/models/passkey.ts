import { userPasskeys } from '@/lib/db/schema';
import { getTableColumns } from 'drizzle-orm';
import { createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';

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

const { reg: _reg, ...publicPasskeyColumns } = getTableColumns(userPasskeys);
export { publicPasskeyColumns };
