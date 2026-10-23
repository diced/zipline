import { db, type DbClient } from '@/lib/db';
import { urls } from '@/lib/db/schema';
import { createId } from '@paralleldrive/cuid2';
import { and, inArray, ne, or, sql } from 'drizzle-orm';
import { createSelectSchema } from 'drizzle-orm/zod';
import { z } from 'zod';
import { discordComponentEmbedSchema } from '@/lib/discordComponentEmbed';
import { discordUrlPreviewModeSchema } from '@/lib/urlPreview';

export { discordUrlPreviewModeSchema } from '@/lib/urlPreview';
export type { DiscordUrlPreviewMode } from '@/lib/urlPreview';

export const urlSchema = createSelectSchema(urls, {
  password: z.boolean(),
  discordPreviewMode: discordUrlPreviewModeSchema,
  discordComponentEmbed: discordComponentEmbedSchema.nullable(),
}).extend({
  similarity: z.number().optional(),
});

export type Url = z.infer<typeof urlSchema>;

function matchingIdentifiers(identifiers: string[]) {
  return or(
    inArray(urls.id, identifiers),
    inArray(urls.code, identifiers),
    inArray(urls.vanity, identifiers),
  );
}

export async function lockUrls(client: DbClient) {
  await client.execute(sql`lock table ${urls} in share row exclusive mode`);
}

export async function urlIdentifiersExist(identifiers: string[], client: DbClient, excludeId?: string) {
  const matches = await client
    .select({ id: urls.id })
    .from(urls)
    .where(and(matchingIdentifiers(identifiers), excludeId ? ne(urls.id, excludeId) : undefined))
    .limit(1);
  return matches.length > 0;
}

export async function getUrl(identifier: string, client: DbClient = db) {
  const matches = await client
    .select()
    .from(urls)
    .where(matchingIdentifiers([identifier]))
    .limit(2);
  return matches.length === 1 ? matches[0] : null;
}

export async function createUrlId(client: DbClient) {
  let id: string;
  do {
    id = createId();
  } while (await urlIdentifiersExist([id], client));
  return id;
}
