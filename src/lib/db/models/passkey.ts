import { userPasskeys } from '@/lib/db/schema';
import { createSelectSchema } from 'drizzle-orm/zod';
import { z } from 'zod';

export const passkeyRegSchema = z.object({
  webauthn: z.object({
    webAuthnUserID: z.string(),
    id: z.string(),
    publicKey: z.string(),
    counter: z.number(),
    transports: z.array(z.string()).optional(),
    deviceType: z.string().optional(),
    backedUp: z.boolean().optional(),
  }),
});

export type PasskeyReg = z.infer<typeof passkeyRegSchema>;

export const userPasskeySchema = createSelectSchema(userPasskeys, { reg: z.unknown() });
export type UserPasskey = z.infer<typeof userPasskeySchema>;
