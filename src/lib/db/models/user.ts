import { db, type Database, type Transaction } from '@/lib/db';
import { OAuthProviderType as OAuthProviderTypeEnum, Role } from '@/lib/db/enums';
import { oauthProviders, userPasskeys, userQuotas, users, userSessions } from '@/lib/db/schema';
import { and, eq, inArray, isNull, ne, sql, type SQL } from 'drizzle-orm';
import type { PgUpdateSetSource } from 'drizzle-orm/pg-core';
import { createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';

export { Role, UserFilesQuota } from '@/lib/db/enums';
export type {
  OAuthProviderType as OAuthProviderTypeValue,
  Role as RoleValue,
  UserFilesQuota as UserFilesQuotaValue,
} from '@/lib/db/enums';

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

export type UserViewSettings = z.infer<typeof userViewSchema>;

export const userSessionSchema = createSelectSchema(userSessions);
export type UserSession = typeof userSessions.$inferSelect;

export const userQuotaSchema = createSelectSchema(userQuotas);
export type UserQuota = typeof userQuotas.$inferSelect;

export const userPasskeySchema = createSelectSchema(userPasskeys, { reg: z.unknown() });
export type UserPasskey = typeof userPasskeys.$inferSelect;

export const oauthProviderSchema = createSelectSchema(oauthProviders).omit({
  accessToken: true,
  refreshToken: true,
});
export type OAuthProvider = Omit<typeof oauthProviders.$inferSelect, 'accessToken' | 'refreshToken'>;
export type OAuthProviderType = OAuthProvider['provider'];
export const OAuthProviderType = OAuthProviderTypeEnum;

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
export type User = Omit<FullUserQueryRow, 'view' | 'avatar'> & {
  view: UserViewSettings;
  avatar?: string | null;
};

export const limitedUserSchema = userSchema.omit({
  oauthProviders: true,
  totpEnabled: true,
  passkeys: true,
  sessions: true,
});
export type LimitedUser = Omit<LimitedUserQueryRow, 'view' | 'avatar'> & {
  view: UserViewSettings;
  avatar?: string | null;
};
export type LoginUser = User & Pick<LoginUserQueryRow, 'password' | 'totpSecret'>;
export type UserRow = typeof users.$inferSelect;
export type UserInsert = typeof users.$inferInsert;
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

const publicUserColumnsWithAvatar = {
  ...publicUserColumns,
  avatar: true,
} as const satisfies UserColumns;

const fullUserRelations = {
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

async function findUserRow(where: SQL | undefined, client: DbClient = db): Promise<UserRow | null> {
  return (await client.query.users.findFirst({ where })) ?? null;
}

async function queryLimitedUser(where: SQL | undefined, client: DbClient, includeAvatar = false) {
  if (includeAvatar) {
    return client.query.users.findFirst({
      columns: publicUserColumnsWithAvatar,
      where,
      with: { quota: true },
    });
  }

  return client.query.users.findFirst({
    columns: publicUserColumns,
    where,
    with: { quota: true },
  });
}

type LimitedUserQueryRow = NonNullable<Awaited<ReturnType<typeof queryLimitedUser>>>;

function parseLimitedUser(row: LimitedUserQueryRow): LimitedUser {
  const { view, ...user } = row;
  return {
    ...user,
    view: userViewSchema.parse(view),
  };
}

async function queryFullUser(where: SQL | undefined, client: DbClient, includeAvatar = false) {
  if (includeAvatar) {
    return client.query.users.findFirst({
      columns: publicUserColumnsWithAvatar,
      extras: { totpEnabled: sql<boolean>`${users.totpSecret} is not null`.as('totpEnabled') },
      where,
      with: fullUserRelations,
    });
  }

  return client.query.users.findFirst({
    columns: publicUserColumns,
    extras: { totpEnabled: sql<boolean>`${users.totpSecret} is not null`.as('totpEnabled') },
    where,
    with: fullUserRelations,
  });
}

type FullUserQueryRow = NonNullable<Awaited<ReturnType<typeof queryFullUser>>>;

async function queryLoginUser(where: SQL | undefined, client: DbClient) {
  return client.query.users.findFirst({
    columns: { ...publicUserColumns, password: true, totpSecret: true },
    extras: { totpEnabled: sql<boolean>`${users.totpSecret} is not null`.as('totpEnabled') },
    where,
    with: fullUserRelations,
  });
}

type LoginUserQueryRow = NonNullable<Awaited<ReturnType<typeof queryLoginUser>>>;

function parseFullUser(row: FullUserQueryRow): User {
  const { view, ...user } = row;
  return {
    ...user,
    view: userViewSchema.parse(view),
  };
}

function parseLoginUser(row: LoginUserQueryRow): LoginUser {
  const { password, totpSecret, ...user } = row;
  return { ...parseFullUser(user), password, totpSecret };
}

async function findLimitedUser(
  where: SQL | undefined,
  client: DbClient,
  includeAvatar = false,
): Promise<LimitedUser | null> {
  const row = await queryLimitedUser(where, client, includeAvatar);
  return row ? parseLimitedUser(row) : null;
}

async function findFullUser(
  where: SQL | undefined,
  client: DbClient,
  options: { avatar?: boolean } = {},
): Promise<User | null> {
  const row = await queryFullUser(where, client, !!options.avatar);
  return row ? parseFullUser(row) : null;
}

export async function findUserRowById(id: string, client: DbClient = db) {
  return findUserRow(eq(users.id, id), client);
}

export async function findUserRowByUsername(username: string, client: DbClient = db) {
  return findUserRow(eq(users.username, username), client);
}

export async function findFullUserById(
  id: string,
  client: DbClient = db,
  options: { avatar?: boolean } = {},
): Promise<User | null> {
  return findFullUser(eq(users.id, id), client, options);
}

export async function findFullUserByUsername(username: string, client: DbClient = db) {
  return findFullUser(eq(users.username, username), client);
}

export async function findLoginUserByUsername(
  username: string,
  client: DbClient = db,
): Promise<LoginUser | null> {
  const row = await queryLoginUser(eq(users.username, username), client);
  return row ? parseLoginUser(row) : null;
}

export async function findFullUserByToken(token: string, client: DbClient = db) {
  return findFullUser(eq(users.token, token), client);
}

export async function findLimitedUserByToken(token: string, client: DbClient = db) {
  return findLimitedUser(eq(users.token, token), client);
}

export async function findFullUserBySessionId(sessionId: string, client: DbClient = db) {
  const session = await client.query.userSessions.findFirst({
    columns: {},
    where: eq(userSessions.id, sessionId),
    with: {
      user: {
        columns: publicUserColumns,
        extras: { totpEnabled: sql<boolean>`${users.totpSecret} is not null`.as('totpEnabled') },
        with: fullUserRelations,
      },
    },
  });
  return session ? parseFullUser(session.user) : null;
}

export async function findLimitedUserBySessionId(sessionId: string, client: DbClient = db) {
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
  return session ? parseLimitedUser(session.user) : null;
}

export async function findLimitedUserById(
  id: string,
  client: DbClient = db,
  options: { avatar?: boolean } = {},
) {
  return findLimitedUser(eq(users.id, id), client, !!options.avatar);
}

export async function listLimitedUsers(
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
  return rows.map(parseLimitedUser);
}

export async function listFullUsers(
  options: { id?: string; avatar?: boolean } = {},
  client: DbClient = db,
): Promise<User[]> {
  const where = options.id ? eq(users.id, options.id) : undefined;
  const rows = options.avatar
    ? await client.query.users.findMany({
        columns: publicUserColumnsWithAvatar,
        extras: { totpEnabled: sql<boolean>`${users.totpSecret} is not null`.as('totpEnabled') },
        where,
        with: fullUserRelations,
      })
    : await client.query.users.findMany({
        columns: publicUserColumns,
        extras: { totpEnabled: sql<boolean>`${users.totpSecret} is not null`.as('totpEnabled') },
        where,
        with: fullUserRelations,
      });
  return rows.map(parseFullUser);
}

export async function createFullUser(data: UserInsert, client: DbClient = db): Promise<User> {
  const [inserted] = await client.insert(users).values(data).returning({ id: users.id });
  if (!inserted) throw new Error('User insert did not return a row');
  const created = await findFullUserById(inserted.id, client);
  if (!created) throw new Error('Inserted user could not be read back');
  return created;
}

export async function createLimitedUser(
  data: UserInsert,
  client: DbClient = db,
  options: { avatar?: boolean } = {},
) {
  const [inserted] = await client.insert(users).values(data).returning({ id: users.id });
  if (!inserted) throw new Error('User insert did not return a row');
  const created = await findLimitedUserById(inserted.id, client, options);
  if (!created) throw new Error('Inserted user could not be read back');
  return created;
}

export async function updateFullUser(id: string, data: UserUpdate, client: DbClient = db) {
  const [updated] = await client.update(users).set(data).where(eq(users.id, id)).returning({ id: users.id });
  return updated ? findFullUserById(updated.id, client) : null;
}

export async function updateUserRow(id: string, data: UserUpdate, client: DbClient = db) {
  const rows = await client.update(users).set(data).where(eq(users.id, id)).returning();
  return rows[0] ?? null;
}

export async function updateLimitedUser(
  id: string,
  data: UserUpdate,
  client: DbClient = db,
  options: { avatar?: boolean } = {},
) {
  const [updated] = await client.update(users).set(data).where(eq(users.id, id)).returning({ id: users.id });
  return updated ? findLimitedUserById(updated.id, client, options) : null;
}

export async function enableTotpIfUnset(id: string, secret: string, client: DbClient = db) {
  const rows = await client
    .update(users)
    .set({ totpSecret: secret })
    .where(and(eq(users.id, id), isNull(users.totpSecret)))
    .returning({ id: users.id });
  return rows.length > 0;
}

export async function disableTotp(id: string, client: DbClient = db) {
  return updateFullUser(id, { totpSecret: null }, client);
}

export async function deleteUserReturningLimited(id: string, client: DbClient = db) {
  const selected = await findLimitedUserById(id, client);
  if (!selected) return null;
  const deleted = await client.delete(users).where(eq(users.id, id)).returning({ id: users.id });
  return deleted[0] ? selected : null;
}

export async function listUserRows(id?: string, client: DbClient = db) {
  return client.query.users.findMany({ where: id ? eq(users.id, id) : undefined });
}
