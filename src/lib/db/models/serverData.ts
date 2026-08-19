import { db, type Transaction } from '@/lib/db';
import {
  files,
  filesToTags,
  folders,
  invites,
  metrics,
  oauthProviders,
  tags,
  thumbnails,
  urls,
  userPasskeys,
  userQuotas,
  users,
} from '@/lib/db/schema';
import { and, eq, inArray, isNull, or } from 'drizzle-orm';
import type { PgUpdateSetSource } from 'drizzle-orm/pg-core';

type UserInsert = typeof users.$inferInsert;
type UserUpdate = PgUpdateSetSource<typeof users>;
type OAuthProviderInsert = typeof oauthProviders.$inferInsert;
type QuotaInsert = typeof userQuotas.$inferInsert;
type PasskeyInsert = typeof userPasskeys.$inferInsert;
type FileInsert = typeof files.$inferInsert;
type FolderInsert = typeof folders.$inferInsert;
type TagInsert = typeof tags.$inferInsert;
type UrlInsert = typeof urls.$inferInsert;
type InviteInsert = typeof invites.$inferInsert;
type MetricInsert = typeof metrics.$inferInsert;

export async function getServerResourceCounts() {
  const [userCount, fileCount, urlCount, folderCount, inviteCount, thumbnailCount, metricCount] =
    await Promise.all([
      db.$count(users),
      db.$count(files),
      db.$count(urls),
      db.$count(folders),
      db.$count(invites),
      db.$count(thumbnails),
      db.$count(metrics),
    ]);

  return {
    users: userCount,
    files: fileCount,
    urls: urlCount,
    folders: folderCount,
    invites: inviteCount,
    thumbnails: thumbnailCount,
    metrics: metricCount,
  };
}

export async function getSettingsForServerExport() {
  return (await db.query.zipline.findFirst()) ?? null;
}

/** Loads the v4 export graph through Drizzle's declared relations in one query. */
export async function getUsersForServerExport() {
  const userRows = await db.query.users.findMany({
    with: {
      passkeys: true,
      quota: true,
      oauthProviders: true,
      invites: true,
      urls: true,
      tags: {
        with: {
          fileTags: {
            columns: {},
            with: { file: { columns: { id: true } } },
          },
        },
      },
      folders: { with: { files: { columns: { id: true } } } },
    },
  });

  return userRows.map(({ tags: userTags, ...user }) => ({
    ...user,
    tags: userTags.map(({ fileTags, ...tag }) => ({
      ...tag,
      files: fileTags.map(({ file }) => file),
    })),
  }));
}

export function getFilesForServerExport() {
  return db.query.files.findMany();
}

export function getThumbnailsForServerExport() {
  return db.query.thumbnails.findMany();
}

export function getMetricsForServerExport() {
  return db.query.metrics.findMany();
}

export async function findImportUserByUsername(username: string) {
  return (
    (await db.query.users.findFirst({
      columns: { id: true },
      where: eq(users.username, username),
    })) ?? null
  );
}

export async function findImportUserByUsernameOrId(username: string, id: string) {
  return (
    (await db.query.users.findFirst({
      columns: { id: true },
      where: or(eq(users.username, username), eq(users.id, id)),
    })) ?? null
  );
}

export type ImportedOauthProviderInput = Pick<
  OAuthProviderInsert,
  'provider' | 'accessToken' | 'refreshToken' | 'oauthId' | 'username'
>;

async function insertOauthProviders(
  tx: Transaction,
  userId: string,
  providers: ImportedOauthProviderInput[],
) {
  if (providers.length === 0) return;
  await tx.insert(oauthProviders).values(providers.map((provider) => ({ ...provider, userId })));
}

export async function findImportOauthProviderByOauthId(oauthId: string | null) {
  return (
    (await db.query.oauthProviders.findFirst({
      columns: { id: true },
      where: oauthId === null ? isNull(oauthProviders.oauthId) : eq(oauthProviders.oauthId, oauthId),
    })) ?? null
  );
}

export async function updateV3ImportUser(
  id: string,
  input: Pick<UserUpdate, 'avatar' | 'totpSecret'>,
  providers: ImportedOauthProviderInput[],
) {
  return db.transaction(async (tx) => {
    const rows = await tx.update(users).set(input).where(eq(users.id, id)).returning({ id: users.id });
    const updated = rows[0];
    if (!updated) throw new Error(`User ${id} does not exist`);
    await insertOauthProviders(tx, id, providers);
    return updated;
  });
}

export async function createV3ImportUser(
  input: Pick<UserInsert, 'username' | 'password' | 'role' | 'token' | 'avatar' | 'totpSecret'>,
  providers: ImportedOauthProviderInput[],
) {
  return db.transaction(async (tx) => {
    const rows = await tx.insert(users).values(input).returning({ id: users.id });
    const created = rows[0];
    if (!created) throw new Error('User insert did not return a row');
    await insertOauthProviders(tx, created.id, providers);
    return created;
  });
}

export async function updateV4ImportUser(
  id: string,
  input: Pick<UserUpdate, 'avatar' | 'totpSecret' | 'view'>,
) {
  const rows = await db.update(users).set(input).where(eq(users.id, id)).returning({ id: users.id });
  const updated = rows[0];
  if (!updated) throw new Error(`User ${id} does not exist`);
  return updated;
}

export async function createV4ImportUser(
  input: Pick<
    UserInsert,
    'username' | 'password' | 'avatar' | 'role' | 'view' | 'totpSecret' | 'token' | 'createdAt'
  >,
) {
  const rows = await db.insert(users).values(input).returning({ id: users.id });
  const created = rows[0];
  if (!created) throw new Error('User insert did not return a row');
  return created;
}

export async function findImportOauthProvider(
  provider: OAuthProviderInsert['provider'],
  oauthId: string | null | undefined,
) {
  const condition =
    oauthId === undefined
      ? eq(oauthProviders.provider, provider)
      : and(
          eq(oauthProviders.provider, provider),
          oauthId === null ? isNull(oauthProviders.oauthId) : eq(oauthProviders.oauthId, oauthId),
        );
  return (await db.query.oauthProviders.findFirst({ columns: { id: true }, where: condition })) ?? null;
}

export async function createImportOauthProvider(input: ImportedOauthProviderInput & { userId: string }) {
  const rows = await db.insert(oauthProviders).values(input).returning({ id: oauthProviders.id });
  const created = rows[0];
  if (!created) throw new Error('OAuth provider insert did not return a row');
  return created;
}

export async function findImportQuotaByUserId(userId: string) {
  return (
    (await db.query.userQuotas.findFirst({
      columns: { id: true },
      where: eq(userQuotas.userId, userId),
    })) ?? null
  );
}

export async function createImportQuota(
  input: Pick<QuotaInsert, 'filesQuota' | 'maxBytes' | 'maxFiles' | 'maxUrls' | 'createdAt'> & {
    userId: string;
  },
) {
  const rows = await db.insert(userQuotas).values(input).returning({ id: userQuotas.id });
  const created = rows[0];
  if (!created) throw new Error('Quota insert did not return a row');
  return created;
}

export async function findImportPasskey(name: string, userId: string) {
  return (
    (await db.query.userPasskeys.findFirst({
      columns: { id: true },
      where: and(eq(userPasskeys.name, name), eq(userPasskeys.userId, userId)),
    })) ?? null
  );
}

export async function createImportPasskey(input: Pick<PasskeyInsert, 'name' | 'reg'> & { userId: string }) {
  const rows = await db.insert(userPasskeys).values(input).returning({ id: userPasskeys.id });
  const created = rows[0];
  if (!created) throw new Error('Passkey insert did not return a row');
  return created;
}

export async function findImportFileByName(name: string) {
  return (await db.query.files.findFirst({ columns: { id: true }, where: eq(files.name, name) })) ?? null;
}

export async function createImportFile(
  input: Pick<
    FileInsert,
    | 'name'
    | 'originalName'
    | 'type'
    | 'size'
    | 'maxViews'
    | 'views'
    | 'deletesAt'
    | 'createdAt'
    | 'favorite'
    | 'password'
    | 'folderId'
  > & { userId: string },
) {
  const rows = await db.insert(files).values(input).returning({ id: files.id });
  const created = rows[0];
  if (!created) throw new Error('File insert did not return a row');
  return created;
}

export async function findImportFolder(name: string, userId: string) {
  return (
    (await db.query.folders.findFirst({
      columns: { id: true },
      where: and(eq(folders.name, name), eq(folders.userId, userId)),
    })) ?? null
  );
}

export async function createV3ImportFolder(
  input: Pick<FolderInsert, 'name' | 'public' | 'createdAt'> & {
    userId: string;
    fileIds: string[];
  },
) {
  return db.transaction(async (tx) => {
    const rows = await tx
      .insert(folders)
      .values({
        userId: input.userId,
        name: input.name,
        public: input.public,
        createdAt: input.createdAt,
      })
      .returning({ id: folders.id });
    const created = rows[0];
    if (!created) throw new Error('Folder insert did not return a row');

    const uniqueFileIds = [...new Set(input.fileIds)];
    if (uniqueFileIds.length > 0) {
      const updatedFiles = await tx
        .update(files)
        .set({ folderId: created.id })
        .where(inArray(files.id, uniqueFileIds))
        .returning({ id: files.id });
      if (updatedFiles.length !== uniqueFileIds.length)
        throw new Error('One or more imported folder files no longer exist');
    }

    return created;
  });
}

export async function createV4ImportFolder(
  input: Pick<FolderInsert, 'name' | 'allowUploads' | 'public' | 'createdAt'> & { userId: string },
) {
  const rows = await db.insert(folders).values(input).returning({ id: folders.id });
  const created = rows[0];
  if (!created) throw new Error('Folder insert did not return a row');
  return created;
}

export async function setImportFolderParent(id: string, parentId: string) {
  const rows = await db
    .update(folders)
    .set({ parentId })
    .where(eq(folders.id, id))
    .returning({ id: folders.id });
  if (!rows[0]) throw new Error(`Folder ${id} does not exist`);
}

export async function findImportTag(name: string, userId: string | null, createdAt: Date) {
  return (
    (await db.query.tags.findFirst({
      columns: { id: true },
      where: and(
        eq(tags.name, name),
        userId === null ? isNull(tags.userId) : eq(tags.userId, userId),
        eq(tags.createdAt, createdAt),
      ),
    })) ?? null
  );
}

export async function createImportTag(
  input: Pick<TagInsert, 'name' | 'color'> & { userId: string; fileIds: string[] },
) {
  return db.transaction(async (tx) => {
    const rows = await tx
      .insert(tags)
      .values({ name: input.name, color: input.color, userId: input.userId })
      .returning({ id: tags.id });
    const created = rows[0];
    if (!created) throw new Error('Tag insert did not return a row');

    if (input.fileIds.length > 0)
      await tx.insert(filesToTags).values(input.fileIds.map((fileId) => ({ fileId, tagId: created.id })));

    return created;
  });
}

export async function findImportUrlByCode(code: string, userId?: string) {
  return (
    (await db.query.urls.findFirst({
      columns: { id: true },
      where: userId ? and(eq(urls.code, code), eq(urls.userId, userId)) : eq(urls.code, code),
    })) ?? null
  );
}

export async function createImportUrl(
  input: Pick<
    UrlInsert,
    'destination' | 'vanity' | 'code' | 'maxViews' | 'views' | 'createdAt' | 'enabled' | 'password'
  > & { userId: string },
) {
  const rows = await db.insert(urls).values(input).returning({ id: urls.id });
  const created = rows[0];
  if (!created) throw new Error('URL insert did not return a row');
  return created;
}

export async function findImportInvite(code: string, inviterId: string) {
  return (
    (await db.query.invites.findFirst({
      columns: { id: true },
      where: and(eq(invites.code, code), eq(invites.inviterId, inviterId)),
    })) ?? null
  );
}

export async function createImportInvite(
  input: Pick<InviteInsert, 'code' | 'uses' | 'maxUses' | 'inviterId' | 'createdAt' | 'expiresAt'>,
) {
  const rows = await db.insert(invites).values(input).returning({ id: invites.id });
  const created = rows[0];
  if (!created) throw new Error('Invite insert did not return a row');
  return created;
}

export async function createImportMetrics(input: Pick<MetricInsert, 'createdAt' | 'data'>[]) {
  if (input.length === 0) return 0;
  const rows = await db.insert(metrics).values(input).returning({ id: metrics.id });
  return rows.length;
}
