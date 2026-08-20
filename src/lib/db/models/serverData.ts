import { db, type Transaction } from '@/lib/db';
import { files, filesToTags, folders, oauthProviders, tags, users } from '@/lib/db/schema';
import { eq, inArray } from 'drizzle-orm';
import type { PgUpdateSetSource } from 'drizzle-orm/pg-core';

type UserInsert = typeof users.$inferInsert;
type UserUpdate = PgUpdateSetSource<typeof users>;
type OAuthProviderInsert = typeof oauthProviders.$inferInsert;
type FolderInsert = typeof folders.$inferInsert;
type TagInsert = typeof tags.$inferInsert;

export async function listExportUsers() {
  return db.query.users.findMany({
    with: {
      passkeys: true,
      quota: true,
      oauthProviders: true,
      invites: true,
      urls: true,
      tags: {
        with: { files: { columns: { id: true } } },
      },
      folders: { with: { files: { columns: { id: true } } } },
    },
  });
}

export type ImportOauthProvider = Pick<
  OAuthProviderInsert,
  'provider' | 'accessToken' | 'refreshToken' | 'oauthId' | 'username'
>;

async function insertOauthProviders(tx: Transaction, userId: string, providers: ImportOauthProvider[]) {
  if (providers.length === 0) return;
  await tx.insert(oauthProviders).values(providers.map((provider) => ({ ...provider, userId })));
}

export async function updateV3User(
  id: string,
  input: Pick<UserUpdate, 'avatar' | 'totpSecret'>,
  providers: ImportOauthProvider[],
) {
  return db.transaction(async (tx) => {
    const rows = await tx.update(users).set(input).where(eq(users.id, id)).returning({ id: users.id });
    const updated = rows[0];
    if (!updated) throw new Error(`User ${id} does not exist`);
    await insertOauthProviders(tx, id, providers);
    return updated;
  });
}

export async function createV3User(
  input: Pick<UserInsert, 'username' | 'password' | 'role' | 'token' | 'avatar' | 'totpSecret'>,
  providers: ImportOauthProvider[],
) {
  return db.transaction(async (tx) => {
    const rows = await tx.insert(users).values(input).returning({ id: users.id });
    const created = rows[0];
    if (!created) throw new Error('User insert did not return a row');
    await insertOauthProviders(tx, created.id, providers);
    return created;
  });
}

export async function createV3Folder(
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

export async function createTagWithFiles(
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
