import { db, type DbClient } from '@/lib/db';
import { zipline } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { resolve } from 'node:path';

type ZiplineRow = typeof zipline.$inferSelect;

const initialSettings = {
  coreTempDirectory: resolve('./uploads/.tmp'),
} satisfies typeof zipline.$inferInsert;

function settingsFromRow({
  id: _id,
  createdAt: _createdAt,
  updatedAt: _updatedAt,
  firstSetup: _firstSetup,
  ...settings
}: ZiplineRow) {
  return settings;
}

type DatabaseSettings = ReturnType<typeof settingsFromRow>;
type DatabaseSettingsUpdate = Partial<DatabaseSettings>;

export async function ensureSettingsRow(client: DbClient = db) {
  const existing = await client.query.zipline.findFirst();
  if (existing) return existing;

  const created = (await client.insert(zipline).values(initialSettings).returning())[0];
  if (!created) throw new Error('Failed to create the Zipline settings row');
  return created;
}

export async function getSettings(client: DbClient = db): Promise<DatabaseSettings | null> {
  const settings = await client.query.zipline.findFirst({
    columns: { id: false, createdAt: false, updatedAt: false, firstSetup: false },
  });
  if (!settings) return null;

  return settings;
}

export async function ensureSettings(client: DbClient = db): Promise<DatabaseSettings> {
  const settings = await getSettings(client);
  if (settings) return settings;

  return settingsFromRow(await ensureSettingsRow(client));
}

export async function updateSettings(
  settingsId: string,
  values: DatabaseSettingsUpdate,
  client: DbClient = db,
): Promise<DatabaseSettings | null> {
  const updated = (await client.update(zipline).set(values).where(eq(zipline.id, settingsId)).returning())[0];

  return updated ? settingsFromRow(updated) : null;
}
