import { oauthProviders } from '@/lib/db/schema';
import { createSelectSchema } from 'drizzle-orm/zod';
import { z } from 'zod';

export const oauthProviderSchema = createSelectSchema(oauthProviders).omit({
  accessToken: true,
  refreshToken: true,
});
export type OAuthProvider = z.infer<typeof oauthProviderSchema>;
