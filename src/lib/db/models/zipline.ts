import { db, type Database, type Transaction } from '@/lib/db';
import { zipline } from '@/lib/db/schema';
import { first } from '@/lib/db/utils';
import { eq, getTableColumns } from 'drizzle-orm';
import type { PgUpdateSetSource } from 'drizzle-orm/pg-core';
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

type DatabaseSettings = Omit<ZiplineRow, 'id' | 'createdAt' | 'updatedAt' | 'firstSetup'> & {
  domains: string[];
  filesDisabledExtensions: string[];
  filesDisabledTypes: string[];
  oauthDiscordAllowedIds: string[];
  oauthDiscordDeniedIds: string[];
  ratelimitAllowList: string[];
};
type DatabaseSettingsUpdate = Omit<
  PgUpdateSetSource<typeof zipline>,
  'id' | 'createdAt' | 'updatedAt' | 'firstSetup'
>;

const initialSettings = {
  coreTempDirectory: resolve('./uploads/.tmp'),
  domains: [],
  filesDisabledExtensions: [],
  filesDisabledTypes: [],
  oauthDiscordAllowedIds: [],
  oauthDiscordDeniedIds: [],
  ratelimitAllowList: [],
} satisfies typeof zipline.$inferInsert;

type SettingsWithNullableArrays = Pick<
  ZiplineRow,
  | 'domains'
  | 'filesDisabledExtensions'
  | 'filesDisabledTypes'
  | 'oauthDiscordAllowedIds'
  | 'oauthDiscordDeniedIds'
  | 'ratelimitAllowList'
>;

function normalizeSettingsArrays<T extends SettingsWithNullableArrays>(row: T) {
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

export async function getSettingsRow(client: DbClient = db) {
  const existing = await client.query.zipline.findFirst();
  return existing ? normalizeSettingsArrays(existing) : null;
}

export async function ensureSettingsRow(client: DbClient = db) {
  const existing = await getSettingsRow(client);
  if (existing) return existing;

  const created = first(await client.insert(zipline).values(initialSettings).returning());
  if (!created) throw new Error('Failed to create the Zipline settings row');
  return normalizeSettingsArrays(created);
}

export async function getSettings(client: DbClient = db): Promise<DatabaseSettings | null> {
  const settings = await client.query.zipline.findFirst({
    columns: { id: false, createdAt: false, updatedAt: false, firstSetup: false },
  });
  if (!settings) return null;

  return normalizeSettingsArrays(settings);
}

export async function ensureSettings(client: DbClient = db): Promise<DatabaseSettings> {
  const settings = await getSettings(client);
  if (settings) return settings;

  const created = await ensureSettingsRow(client);
  const {
    id: _id,
    createdAt: _createdAt,
    updatedAt: _updatedAt,
    firstSetup: _firstSetup,
    ...result
  } = created;
  return result;
}

export async function updateSettings(
  settingsId: string,
  values: DatabaseSettingsUpdate,
  client: DbClient = db,
): Promise<DatabaseSettings | null> {
  const updated = first(
    await client
      .update(zipline)
      .set(values)
      .where(eq(zipline.id, settingsId))
      .returning(databaseSettingsColumns),
  );

  return updated ? normalizeSettingsArrays(updated) : null;
}

export async function claimFirstSetup(client: Transaction): Promise<boolean> {
  const claimed = await client
    .update(zipline)
    .set({ firstSetup: false })
    .where(eq(zipline.firstSetup, true))
    .returning({ id: zipline.id });

  return claimed.length > 0;
}
