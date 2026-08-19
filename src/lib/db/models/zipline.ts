import { db, type Database, type Transaction } from '@/lib/db';
import { zipline } from '@/lib/db/schema';
import { first } from '@/lib/db/utils';
import { eq, getTableColumns } from 'drizzle-orm';
import { resolve } from 'node:path';

type DbClient = Database | Transaction;
type ZiplineRow = typeof zipline.$inferSelect;

const {
  id: _id,
  createdAt: _createdAt,
  updatedAt: _updatedAt,
  firstSetup: _firstSetup,
  ...databaseSettingsColumns
} = getTableColumns(zipline);

export type DatabaseSettings = Omit<ZiplineRow, 'id' | 'createdAt' | 'updatedAt' | 'firstSetup'> & {
  domains: string[];
  filesDisabledExtensions: string[];
  filesDisabledTypes: string[];
  oauthDiscordAllowedIds: string[];
  oauthDiscordDeniedIds: string[];
  ratelimitAllowList: string[];
};

const initialSettings = {
  coreTempDirectory: resolve('./uploads/.tmp'),
  domains: [],
  filesDisabledExtensions: [],
  filesDisabledTypes: [],
  oauthDiscordAllowedIds: [],
  oauthDiscordDeniedIds: [],
  ratelimitAllowList: [],
} satisfies typeof zipline.$inferInsert;

function normalizeSettingsArrays<T extends ZiplineRow>(row: T): T & DatabaseSettings {
  return {
    ...row,
    domains: row.domains ?? [],
    filesDisabledExtensions: row.filesDisabledExtensions ?? [],
    filesDisabledTypes: row.filesDisabledTypes ?? [],
    oauthDiscordAllowedIds: row.oauthDiscordAllowedIds ?? [],
    oauthDiscordDeniedIds: row.oauthDiscordDeniedIds ?? [],
    ratelimitAllowList: row.ratelimitAllowList ?? [],
  };
}

export async function findZipline(client: DbClient = db) {
  const existing = first(await client.select().from(zipline).limit(1));
  return existing ? normalizeSettingsArrays(existing) : null;
}

export async function getZipline(client: DbClient = db) {
  const existing = await findZipline(client);
  if (existing) return existing;

  const created = first(await client.insert(zipline).values(initialSettings).returning());
  if (!created) throw new Error('Failed to create the Zipline settings row');
  return normalizeSettingsArrays(created);
}

export async function getDatabaseSettings(client: DbClient = db): Promise<DatabaseSettings | null> {
  const settings = first(await client.select(databaseSettingsColumns).from(zipline).limit(1));
  if (!settings) return null;

  return normalizeSettingsArrays(settings as ZiplineRow);
}

export async function getOrCreateDatabaseSettings(client: DbClient = db): Promise<DatabaseSettings> {
  const settings = await getDatabaseSettings(client);
  if (settings) return settings;

  const created = await getZipline(client);
  const {
    id: _id,
    createdAt: _createdAt,
    updatedAt: _updatedAt,
    firstSetup: _firstSetup,
    ...result
  } = created;
  return result;
}

export async function updateDatabaseSettings(
  settingsId: string,
  values: Partial<DatabaseSettings>,
  client: DbClient = db,
): Promise<DatabaseSettings | null> {
  const updated = first(
    await client
      .update(zipline)
      .set(values)
      .where(eq(zipline.id, settingsId))
      .returning(databaseSettingsColumns),
  );

  return updated ? normalizeSettingsArrays(updated as ZiplineRow) : null;
}

export async function claimFirstSetup(client: Transaction): Promise<boolean> {
  const claimed = await client
    .update(zipline)
    .set({ firstSetup: false })
    .where(eq(zipline.firstSetup, true))
    .returning({ id: zipline.id });

  return claimed.length > 0;
}
