import { db, type Database, type DbClient } from '@/lib/db';
import type { Role } from '@/lib/db/enums';
import { users } from '@/lib/db/schema';
import { and, eq, isNotNull, isNull } from 'drizzle-orm';
import type { PgUpdateSetSource } from 'drizzle-orm/pg-core';
import { createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';
import { oauthProviderSchema } from './oauth';
import { userPasskeySchema } from './passkey';
import { userQuotaSchema } from './quota';
import { userSessionSchema } from './session';

export const userViewSchema = z
  .object({
    enabled: z.boolean().nullish(),
    disableTextFiles: z.boolean().nullish(),
    align: z.enum(['left', 'center', 'right']).nullish(),
    showMimetype: z.boolean().nullish(),
    showTags: z.boolean().nullish(),
    showFolder: z.boolean().nullish(),
    content: z.string().nullish(),
    embed: z.boolean().nullish(),
    embedMediaOnly: z.boolean().nullish(),
    embedTitle: z.string().nullish(),
    embedDescription: z.string().nullish(),
    embedColor: z.string().nullish(),
    embedSiteName: z.string().nullish(),
  })
  .partial();

type UserViewSettings = z.infer<typeof userViewSchema>;

const userScalarSchema = createSelectSchema(users, { view: userViewSchema }).pick({
  id: true,
  username: true,
  createdAt: true,
  updatedAt: true,
  role: true,
  view: true,
  avatar: true,
});

export const userSchema = userScalarSchema.partial({ avatar: true }).extend({
  sessions: z.array(userSessionSchema),
  oauthProviders: z.array(oauthProviderSchema),
  totpEnabled: z.boolean(),
  passkeys: z.array(userPasskeySchema).optional(),
  quota: userQuotaSchema.nullable().optional(),
});

export const limitedUserSchema = userSchema.omit({
  oauthProviders: true,
  totpEnabled: true,
  passkeys: true,
  sessions: true,
});

type UserInsert = typeof users.$inferInsert;
export type UserUpdate = Omit<PgUpdateSetSource<typeof users>, 'id' | 'createdAt' | 'updatedAt'>;
type UserFindManyConfig = NonNullable<Parameters<Database['query']['users']['findMany']>[0]>;
type UserWhere = NonNullable<UserFindManyConfig['where']>;
type UserColumns = NonNullable<UserFindManyConfig['columns']>;

const publicUserColumns = {
  id: true,
  username: true,
  createdAt: true,
  updatedAt: true,
  role: true,
  view: true,
} as const satisfies UserColumns;

const publicUserColumnsWithAvatar = {
  ...publicUserColumns,
  avatar: true,
} as const satisfies UserColumns;

const userTotpExtras = {
  totpEnabled: (user) => isNotNull(user.totpSecret).mapWith(Boolean),
} satisfies NonNullable<UserFindManyConfig['extras']>;

const userRelations = {
  sessions: true,
  oauthProviders: {
    columns: {
      accessToken: false,
      refreshToken: false,
    },
  },
  passkeys: true,
  quota: true,
} as const satisfies NonNullable<UserFindManyConfig['with']>;

function parseView<T extends { view: unknown }>(row: T) {
  return { ...row, view: userViewSchema.parse(row.view) };
}

async function queryUserSummary(where: UserWhere, client: DbClient) {
  return client.query.users.findFirst({
    columns: publicUserColumns,
    where,
    with: { quota: true },
  });
}

async function queryUser(where: UserWhere, client: DbClient) {
  return client.query.users.findFirst({
    columns: publicUserColumns,
    extras: userTotpExtras,
    where,
    with: userRelations,
  });
}

async function queryLoginUser(where: UserWhere, client: DbClient) {
  return client.query.users.findFirst({
    columns: { ...publicUserColumns, password: true, totpSecret: true },
    extras: userTotpExtras,
    where,
    with: userRelations,
  });
}

function parseUser(row: NonNullable<Awaited<ReturnType<typeof queryUser>>>): User {
  return parseView(row);
}

function parseUserSummary(row: NonNullable<Awaited<ReturnType<typeof queryUserSummary>>>): LimitedUser {
  return parseView(row);
}

function parseLoginUser(row: NonNullable<Awaited<ReturnType<typeof queryLoginUser>>>): LoginUser {
  const { password, totpSecret, ...user } = row;
  return { ...parseView(user), password, totpSecret };
}

type UserQueryRow = NonNullable<Awaited<ReturnType<typeof queryUser>>>;
type UserSummaryQueryRow = NonNullable<Awaited<ReturnType<typeof queryUserSummary>>>;
type LoginUserQueryRow = NonNullable<Awaited<ReturnType<typeof queryLoginUser>>>;

export type User = Omit<UserQueryRow, 'view'> & {
  view: UserViewSettings;
  avatar?: string | null;
};
export type LimitedUser = Omit<UserSummaryQueryRow, 'view'> & {
  view: UserViewSettings;
  avatar?: string | null;
};
type LoginUser = User & Pick<LoginUserQueryRow, 'password' | 'totpSecret'>;

export async function getUserIdentity(id: string, client: DbClient = db) {
  const rows = await client
    .select({ id: users.id, username: users.username, role: users.role })
    .from(users)
    .where(eq(users.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function usernameExists(username: string, client: DbClient = db) {
  const rows = await client.select({ id: users.id }).from(users).where(eq(users.username, username)).limit(1);
  return rows.length > 0;
}

export async function getUser(id: string, client: DbClient = db) {
  const row = await queryUser({ id }, client);
  return row ? parseUser(row) : null;
}

export async function getLoginUser(username: string, client: DbClient = db) {
  const row = await queryLoginUser({ username }, client);
  return row ? parseLoginUser(row) : null;
}

export async function getUserByToken(token: string, client: DbClient = db) {
  const row = await queryUser({ token }, client);
  return row ? parseUser(row) : null;
}

export async function getUserSummaryByToken(token: string, client: DbClient = db) {
  const row = await queryUserSummary({ token }, client);
  return row ? parseUserSummary(row) : null;
}

export async function getUserBySession(sessionId: string, client: DbClient = db) {
  const session = await client.query.userSessions.findFirst({
    columns: {},
    where: { id: sessionId },
    with: {
      user: {
        columns: publicUserColumns,
        extras: userTotpExtras,
        with: userRelations,
      },
    },
  });
  return session ? parseUser(session.user) : null;
}

export async function getUserSummaryBySession(sessionId: string, client: DbClient = db) {
  const session = await client.query.userSessions.findFirst({
    columns: {},
    where: { id: sessionId },
    with: {
      user: {
        columns: publicUserColumns,
        with: { quota: true },
      },
    },
  });
  return session ? parseUserSummary(session.user) : null;
}

export async function getUserSummary(id: string, client: DbClient = db) {
  const row = await queryUserSummary({ id }, client);
  return row ? parseUserSummary(row) : null;
}

export async function listUsers(
  options: { roles?: readonly Role[]; excludeId?: string; avatar?: boolean } = {},
  client: DbClient = db,
) {
  if (options.roles?.length === 0) return [];
  const rows = await client.query.users.findMany({
    columns: options.avatar ? publicUserColumnsWithAvatar : publicUserColumns,
    where:
      options.roles || options.excludeId
        ? {
            role: options.roles ? { in: [...options.roles] } : undefined,
            id: options.excludeId ? { ne: options.excludeId } : undefined,
          }
        : undefined,
    with: { quota: true },
  });
  return rows.map(parseUserSummary);
}

export async function listUserDetails(
  options: { id?: string; avatar?: boolean } = {},
  client: DbClient = db,
) {
  const rows = await client.query.users.findMany({
    columns: options.avatar ? publicUserColumnsWithAvatar : publicUserColumns,
    extras: userTotpExtras,
    where: options.id ? { id: options.id } : undefined,
    with: userRelations,
  });
  return rows.map(parseUser);
}

export async function createUser(data: UserInsert, client: DbClient = db) {
  const [inserted] = await client.insert(users).values(data).returning({ id: users.id });
  if (!inserted) throw new Error('User insert did not return a row');
  const created = await getUser(inserted.id, client);
  if (!created) throw new Error('Inserted user could not be read back');
  return created;
}

export async function updateUser(id: string, data: UserUpdate, client: DbClient = db) {
  const [updated] = await client.update(users).set(data).where(eq(users.id, id)).returning({ id: users.id });
  return updated ? getUser(updated.id, client) : null;
}

export async function updateUserSummary(id: string, data: UserUpdate, client: DbClient = db) {
  const [updated] = await client.update(users).set(data).where(eq(users.id, id)).returning({ id: users.id });
  return updated ? getUserSummary(updated.id, client) : null;
}

export async function enableTotp(id: string, secret: string, client: DbClient = db) {
  const rows = await client
    .update(users)
    .set({ totpSecret: secret })
    .where(and(eq(users.id, id), isNull(users.totpSecret)))
    .returning({ id: users.id });
  return rows.length > 0;
}

export async function removeUser(id: string, client: DbClient = db) {
  const selected = await getUserSummary(id, client);
  if (!selected) return null;
  const deleted = await client.delete(users).where(eq(users.id, id)).returning({ id: users.id });
  return deleted[0] ? selected : null;
}
