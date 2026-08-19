import { db } from '@/lib/db';
import type { OAuthProviderType } from '@/lib/db/enums';
import { oauthProviders } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';
import { createSelectSchema } from 'drizzle-zod';
import type { DbClient } from './user';

export const oauthProviderSchema = createSelectSchema(oauthProviders).omit({
  accessToken: true,
  refreshToken: true,
});
export type OAuthProvider = Omit<typeof oauthProviders.$inferSelect, 'accessToken' | 'refreshToken'>;

export async function removeOAuthProviders(
  userId: string,
  provider?: OAuthProviderType,
  client: DbClient = db,
) {
  return client
    .delete(oauthProviders)
    .where(
      provider
        ? and(eq(oauthProviders.userId, userId), eq(oauthProviders.provider, provider))
        : eq(oauthProviders.userId, userId),
    )
    .returning();
}
