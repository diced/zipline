import { db } from '@/lib/db';
import type { OAuthProviderType } from '@/lib/db/enums';
import { oauthProviders } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';
import type { DbClient } from './user';

export type OAuthProviderRow = typeof oauthProviders.$inferSelect;
export type OAuthProviderInsert = typeof oauthProviders.$inferInsert;

export async function findOAuthProvider(provider: OAuthProviderType, oauthId: string, client: DbClient = db) {
  const rows = await client
    .select()
    .from(oauthProviders)
    .where(and(eq(oauthProviders.provider, provider), eq(oauthProviders.oauthId, oauthId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function createOAuthProvider(data: OAuthProviderInsert, client: DbClient = db) {
  const rows = await client.insert(oauthProviders).values(data).returning();
  if (!rows[0]) throw new Error('OAuth provider insert did not return a row');
  return rows[0];
}

export async function updateOAuthProvider(
  id: string,
  data: Partial<Omit<OAuthProviderInsert, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>,
  client: DbClient = db,
) {
  const rows = await client.update(oauthProviders).set(data).where(eq(oauthProviders.id, id)).returning();
  return rows[0] ?? null;
}

export async function deleteOAuthProviders(
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
