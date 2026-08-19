import { db, type Transaction } from '@/lib/db';
import type { OAuthProviderType, Role, UserFilesQuota } from '@/lib/db/enums';
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
  zipline,
  type JsonValue,
} from '@/lib/db/schema';
import { firstOrNull } from '@/lib/db/utils';
import { and, eq, inArray, isNull, or } from 'drizzle-orm';

type JsonObject = Record<string, JsonValue | undefined>;

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
  const rows = await db.select().from(zipline).limit(1);
  return firstOrNull(rows);
}

function appendToMap<T>(map: Map<string, T[]>, key: string | null, value: T) {
  if (!key) return;
  const values = map.get(key);
  if (values) values.push(value);
  else map.set(key, [value]);
}

/** Recreates the relation shape used by the v4 server export without N+1 queries. */
export async function getUsersForServerExport() {
  const [
    userRows,
    passkeyRows,
    quotaRows,
    providerRows,
    inviteRows,
    urlRows,
    tagRows,
    folderRows,
    fileRelationRows,
    tagFileRows,
  ] = await Promise.all([
    db.select().from(users),
    db.select().from(userPasskeys),
    db.select().from(userQuotas),
    db.select().from(oauthProviders),
    db.select().from(invites),
    db.select().from(urls),
    db.select().from(tags),
    db.select().from(folders),
    db.select({ id: files.id, folderId: files.folderId }).from(files),
    db.select().from(filesToTags),
  ]);

  const passkeysByUser = new Map<string, typeof passkeyRows>();
  const providersByUser = new Map<string, typeof providerRows>();
  const invitesByUser = new Map<string, typeof inviteRows>();
  const urlsByUser = new Map<string, typeof urlRows>();
  const tagsByUser = new Map<string, ((typeof tagRows)[number] & { files: { id: string }[] })[]>();
  const foldersByUser = new Map<string, ((typeof folderRows)[number] & { files: { id: string }[] })[]>();
  const quotaByUser = new Map(
    quotaRows.flatMap((quota) => (quota.userId ? [[quota.userId, quota] as const] : [])),
  );

  for (const passkey of passkeyRows) appendToMap(passkeysByUser, passkey.userId, passkey);
  for (const provider of providerRows) appendToMap(providersByUser, provider.userId, provider);
  for (const invite of inviteRows) appendToMap(invitesByUser, invite.inviterId, invite);
  for (const url of urlRows) appendToMap(urlsByUser, url.userId, url);

  const fileIdsByFolder = new Map<string, { id: string }[]>();
  for (const file of fileRelationRows) appendToMap(fileIdsByFolder, file.folderId, { id: file.id });

  const fileIdsByTag = new Map<string, { id: string }[]>();
  for (const relation of tagFileRows) appendToMap(fileIdsByTag, relation.tagId, { id: relation.fileId });

  for (const tag of tagRows)
    appendToMap(tagsByUser, tag.userId, { ...tag, files: fileIdsByTag.get(tag.id) ?? [] });
  for (const folder of folderRows)
    appendToMap(foldersByUser, folder.userId, {
      ...folder,
      files: fileIdsByFolder.get(folder.id) ?? [],
    });

  return userRows.map((user) => ({
    ...user,
    passkeys: passkeysByUser.get(user.id) ?? [],
    quota: quotaByUser.get(user.id) ?? null,
    oauthProviders: providersByUser.get(user.id) ?? [],
    invites: invitesByUser.get(user.id) ?? [],
    urls: urlsByUser.get(user.id) ?? [],
    tags: tagsByUser.get(user.id) ?? [],
    folders: foldersByUser.get(user.id) ?? [],
  }));
}

export function getFilesForServerExport() {
  return db.select().from(files);
}

export function getThumbnailsForServerExport() {
  return db.select().from(thumbnails);
}

export function getMetricsForServerExport() {
  return db.select().from(metrics);
}

export async function findImportUserByUsername(username: string) {
  const rows = await db.select({ id: users.id }).from(users).where(eq(users.username, username)).limit(1);
  return firstOrNull(rows);
}

export async function findImportUserByUsernameOrId(username: string, id: string) {
  const rows = await db
    .select({ id: users.id })
    .from(users)
    .where(or(eq(users.username, username), eq(users.id, id)))
    .limit(1);
  return firstOrNull(rows);
}

export type ImportedOauthProviderInput = {
  provider: OAuthProviderType;
  accessToken: string;
  refreshToken: string | null;
  oauthId?: string | null;
  username: string;
};

async function insertOauthProviders(
  tx: Transaction,
  userId: string,
  providers: ImportedOauthProviderInput[],
) {
  if (providers.length === 0) return;
  await tx.insert(oauthProviders).values(providers.map((provider) => ({ ...provider, userId })));
}

export async function findImportOauthProviderByOauthId(oauthId: string | null) {
  const rows = await db
    .select({ id: oauthProviders.id })
    .from(oauthProviders)
    .where(oauthId === null ? isNull(oauthProviders.oauthId) : eq(oauthProviders.oauthId, oauthId))
    .limit(1);
  return firstOrNull(rows);
}

export async function updateV3ImportUser(
  id: string,
  input: { avatar: string | null; totpSecret: string | null },
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
  input: {
    username: string;
    password: string | null;
    role: Role;
    token: string;
    avatar: string | null;
    totpSecret: string | null;
  },
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
  input: { avatar: string | null; totpSecret: string | null; view: JsonObject },
) {
  const rows = await db.update(users).set(input).where(eq(users.id, id)).returning({ id: users.id });
  const updated = rows[0];
  if (!updated) throw new Error(`User ${id} does not exist`);
  return updated;
}

export async function createV4ImportUser(input: {
  username: string;
  password: string | null;
  avatar: string | null;
  role: Role;
  view: JsonObject;
  totpSecret: string | null;
  token: string;
  createdAt: Date;
}) {
  const rows = await db.insert(users).values(input).returning({ id: users.id });
  const created = rows[0];
  if (!created) throw new Error('User insert did not return a row');
  return created;
}

export async function findImportOauthProvider(
  provider: OAuthProviderType,
  oauthId: string | null | undefined,
) {
  const condition =
    oauthId === undefined
      ? eq(oauthProviders.provider, provider)
      : and(
          eq(oauthProviders.provider, provider),
          oauthId === null ? isNull(oauthProviders.oauthId) : eq(oauthProviders.oauthId, oauthId),
        );
  const rows = await db.select({ id: oauthProviders.id }).from(oauthProviders).where(condition).limit(1);
  return firstOrNull(rows);
}

export async function createImportOauthProvider(input: ImportedOauthProviderInput & { userId: string }) {
  const rows = await db.insert(oauthProviders).values(input).returning({ id: oauthProviders.id });
  const created = rows[0];
  if (!created) throw new Error('OAuth provider insert did not return a row');
  return created;
}

export async function findImportQuotaByUserId(userId: string) {
  const rows = await db
    .select({ id: userQuotas.id })
    .from(userQuotas)
    .where(eq(userQuotas.userId, userId))
    .limit(1);
  return firstOrNull(rows);
}

export async function createImportQuota(input: {
  filesQuota: UserFilesQuota;
  maxBytes: string | null;
  maxFiles: number | null;
  maxUrls: number | null;
  userId: string;
  createdAt: Date;
}) {
  const rows = await db.insert(userQuotas).values(input).returning({ id: userQuotas.id });
  const created = rows[0];
  if (!created) throw new Error('Quota insert did not return a row');
  return created;
}

export async function findImportPasskey(name: string, userId: string) {
  const rows = await db
    .select({ id: userPasskeys.id })
    .from(userPasskeys)
    .where(and(eq(userPasskeys.name, name), eq(userPasskeys.userId, userId)))
    .limit(1);
  return firstOrNull(rows);
}

export async function createImportPasskey(input: { name: string; reg: JsonObject; userId: string }) {
  const rows = await db.insert(userPasskeys).values(input).returning({ id: userPasskeys.id });
  const created = rows[0];
  if (!created) throw new Error('Passkey insert did not return a row');
  return created;
}

export async function findImportFileByName(name: string) {
  const rows = await db.select({ id: files.id }).from(files).where(eq(files.name, name)).limit(1);
  return firstOrNull(rows);
}

export async function createImportFile(input: {
  userId: string;
  name: string;
  originalName: string | null;
  type: string;
  size: number;
  maxViews: number | null;
  views: number;
  deletesAt: Date | null;
  createdAt: Date;
  favorite: boolean;
  password: string | null;
  folderId?: string | null;
}) {
  const rows = await db.insert(files).values(input).returning({ id: files.id });
  const created = rows[0];
  if (!created) throw new Error('File insert did not return a row');
  return created;
}

export async function findImportFolder(name: string, userId: string) {
  const rows = await db
    .select({ id: folders.id })
    .from(folders)
    .where(and(eq(folders.name, name), eq(folders.userId, userId)))
    .limit(1);
  return firstOrNull(rows);
}

export async function createV3ImportFolder(input: {
  userId: string;
  name: string;
  public: boolean;
  createdAt: Date;
  fileIds: string[];
}) {
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

export async function createV4ImportFolder(input: {
  userId: string;
  name: string;
  allowUploads: boolean;
  public: boolean;
  createdAt: Date;
}) {
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
  const rows = await db
    .select({ id: tags.id })
    .from(tags)
    .where(
      and(
        eq(tags.name, name),
        userId === null ? isNull(tags.userId) : eq(tags.userId, userId),
        eq(tags.createdAt, createdAt),
      ),
    )
    .limit(1);
  return firstOrNull(rows);
}

export async function createImportTag(input: {
  name: string;
  color: string;
  userId: string;
  fileIds: string[];
}) {
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
  const rows = await db
    .select({ id: urls.id })
    .from(urls)
    .where(userId ? and(eq(urls.code, code), eq(urls.userId, userId)) : eq(urls.code, code))
    .limit(1);
  return firstOrNull(rows);
}

export async function createImportUrl(input: {
  userId: string;
  destination: string;
  vanity: string | null;
  code: string;
  maxViews: number | null;
  views: number;
  createdAt: Date;
  enabled?: boolean;
  password?: string | null;
}) {
  const rows = await db.insert(urls).values(input).returning({ id: urls.id });
  const created = rows[0];
  if (!created) throw new Error('URL insert did not return a row');
  return created;
}

export async function findImportInvite(code: string, inviterId: string) {
  const rows = await db
    .select({ id: invites.id })
    .from(invites)
    .where(and(eq(invites.code, code), eq(invites.inviterId, inviterId)))
    .limit(1);
  return firstOrNull(rows);
}

export async function createImportInvite(input: {
  code: string;
  uses: number;
  maxUses: number | null;
  inviterId: string;
  createdAt: Date;
  expiresAt: Date | null;
}) {
  const rows = await db.insert(invites).values(input).returning({ id: invites.id });
  const created = rows[0];
  if (!created) throw new Error('Invite insert did not return a row');
  return created;
}

export async function createImportMetrics(input: { createdAt: Date; data: JsonObject }[]) {
  if (input.length === 0) return 0;
  const rows = await db.insert(metrics).values(input).returning({ id: metrics.id });
  return rows.length;
}
