import { db, type Database, type Transaction } from '@/lib/db';
import type { Role } from '@/lib/db/enums';
import { users, userSessions } from '@/lib/db/schema';
import { and, eq, inArray, isNull, ne, sql, type SQL } from 'drizzle-orm';
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
export type User = Omit<UserQueryRow, 'view' | 'avatar'> & {
  view: UserViewSettings;
  avatar?: string | null;
};

export const limitedUserSchema = userSchema.omit({
  oauthProviders: true,
  totpEnabled: true,
  passkeys: true,
  sessions: true,
});
export type LimitedUser = Omit<UserSummaryQueryRow, 'view' | 'avatar'> & {
  view: UserViewSettings;
  avatar?: string | null;
};
type LoginUser = User & Pick<LoginUserQueryRow, 'password' | 'totpSecret'>;
type UserInsert = typeof users.$inferInsert;
export type UserUpdate = Omit<PgUpdateSetSource<typeof users>, 'id' | 'createdAt' | 'updatedAt'>;
export type DbClient = Database | Transaction;

type UserFindManyConfig = NonNullable<Parameters<Database['query']['users']['findMany']>[0]>;
type UserColumns = NonNullable<UserFindManyConfig['columns']>;

const publicUserColumns = {
  id: true,
  username: true,
  createdAt: true,
  updatedAt: true,
  role: true,
  view: true,
} as const satisfies UserColumns;

const userIdentityColumns = {
  id: true,
  username: true,
  role: true,
} as const satisfies UserColumns;

const publicUserColumnsWithAvatar = {
  ...publicUserColumns,
  avatar: true,
} as const satisfies UserColumns;

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
} as const;

async function queryUserSummary(where: SQL | undefined, client: DbClient) {
  return client.query.users.findFirst({
    columns: publicUserColumns,
    where,
    with: { quota: true },
  });
}

type UserSummaryQueryRow = NonNullable<Awaited<ReturnType<typeof queryUserSummary>>>;

function parseUserSummary(row: UserSummaryQueryRow): LimitedUser {
  const { view, ...user } = row;
  return {
    ...user,
    view: userViewSchema.parse(view),
  };
}

async function queryUser(where: SQL | undefined, client: DbClient) {
  return client.query.users.findFirst({
    columns: publicUserColumns,
    extras: { totpEnabled: sql<boolean>`${users.totpSecret} is not null`.as('totpEnabled') },
    where,
    with: userRelations,
  });
}

type UserQueryRow = NonNullable<Awaited<ReturnType<typeof queryUser>>>;

async function queryLoginUser(where: SQL | undefined, client: DbClient) {
  return client.query.users.findFirst({
    columns: { ...publicUserColumns, password: true, totpSecret: true },
    extras: { totpEnabled: sql<boolean>`${users.totpSecret} is not null`.as('totpEnabled') },
    where,
    with: userRelations,
  });
}

type LoginUserQueryRow = NonNullable<Awaited<ReturnType<typeof queryLoginUser>>>;

function parseUser(row: UserQueryRow): User {
  const { view, ...user } = row;
  return {
    ...user,
    view: userViewSchema.parse(view),
  };
}

function parseLoginUser(row: LoginUserQueryRow): LoginUser {
  const { password, totpSecret, ...user } = row;
  return { ...parseUser(user), password, totpSecret };
}

async function getUserSummaryWhere(where: SQL | undefined, client: DbClient): Promise<LimitedUser | null> {
  const row = await queryUserSummary(where, client);
  return row ? parseUserSummary(row) : null;
}

async function getUserWhere(where: SQL | undefined, client: DbClient): Promise<User | null> {
  const row = await queryUser(where, client);
  return row ? parseUser(row) : null;
}

export async function getUserIdentity(id: string, client: DbClient = db) {
  return (
    (await client.query.users.findFirst({
      columns: userIdentityColumns,
      where: eq(users.id, id),
    })) ?? null
  );
}

export async function usernameExists(username: string, client: DbClient = db) {
  return !!(await client.query.users.findFirst({
    columns: { id: true },
    where: eq(users.username, username),
  }));
}

export async function getUser(id: string, client: DbClient = db): Promise<User | null> {
  return getUserWhere(eq(users.id, id), client);
}

export async function getLoginUser(username: string, client: DbClient = db): Promise<LoginUser | null> {
  const row = await queryLoginUser(eq(users.username, username), client);
  return row ? parseLoginUser(row) : null;
}

export async function getUserByToken(token: string, client: DbClient = db) {
  return getUserWhere(eq(users.token, token), client);
}

export async function getUserSummaryByToken(token: string, client: DbClient = db) {
  return getUserSummaryWhere(eq(users.token, token), client);
}

export async function getUserBySession(sessionId: string, client: DbClient = db) {
  const session = await client.query.userSessions.findFirst({
    columns: {},
    where: eq(userSessions.id, sessionId),
    with: {
      user: {
        columns: publicUserColumns,
        extras: { totpEnabled: sql<boolean>`${users.totpSecret} is not null`.as('totpEnabled') },
        with: userRelations,
      },
    },
  });
  return session ? parseUser(session.user) : null;
}

export async function getUserSummaryBySession(sessionId: string, client: DbClient = db) {
  const session = await client.query.userSessions.findFirst({
    columns: {},
    where: eq(userSessions.id, sessionId),
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
  return getUserSummaryWhere(eq(users.id, id), client);
}

export async function listUsers(
  options: { roles?: readonly Role[]; excludeId?: string; avatar?: boolean } = {},
  client: DbClient = db,
) {
  const conditions: SQL[] = [];
  if (options.roles) {
    if (!options.roles.length) return [];
    conditions.push(inArray(users.role, [...options.roles]));
  }
  if (options.excludeId) conditions.push(ne(users.id, options.excludeId));
  const where = conditions.length ? and(...conditions) : undefined;
  const rows = options.avatar
    ? await client.query.users.findMany({
        columns: publicUserColumnsWithAvatar,
        where,
        with: { quota: true },
      })
    : await client.query.users.findMany({
        columns: publicUserColumns,
        where,
        with: { quota: true },
      });
  return rows.map(parseUserSummary);
}

export async function listUserDetails(
  options: { id?: string; avatar?: boolean } = {},
  client: DbClient = db,
): Promise<User[]> {
  const where = options.id ? eq(users.id, options.id) : undefined;
  const rows = options.avatar
    ? await client.query.users.findMany({
        columns: publicUserColumnsWithAvatar,
        extras: { totpEnabled: sql<boolean>`${users.totpSecret} is not null`.as('totpEnabled') },
        where,
        with: userRelations,
      })
    : await client.query.users.findMany({
        columns: publicUserColumns,
        extras: { totpEnabled: sql<boolean>`${users.totpSecret} is not null`.as('totpEnabled') },
        where,
        with: userRelations,
      });
  return rows.map(parseUser);
}

export async function createUser(data: UserInsert, client: DbClient = db): Promise<User> {
  const [inserted] = await client.insert(users).values(data).returning({ id: users.id });
  if (!inserted) throw new Error('User insert did not return a row');
  const created = await getUser(inserted.id, client);
  if (!created) throw new Error('Inserted user could not be read back');
  return created;
}

export async function createUserSummary(data: UserInsert, client: DbClient = db) {
  const [inserted] = await client.insert(users).values(data).returning({ id: users.id });
  if (!inserted) throw new Error('User insert did not return a row');
  const created = await getUserSummary(inserted.id, client);
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
