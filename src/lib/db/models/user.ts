import { db, type Database, type Transaction } from '@/lib/db';
import { OAuthProviderType as OAuthProviderTypeEnum, Role, UserFilesQuota } from '@/lib/db/enums';
import { oauthProviders, userPasskeys, userQuotas, users, userSessions } from '@/lib/db/schema';
import { and, eq, inArray, isNull, ne, type SQL } from 'drizzle-orm';
import { z } from 'zod';

export { Role, UserFilesQuota } from '@/lib/db/enums';
export type {
  OAuthProviderType as OAuthProviderTypeValue,
  Role as RoleValue,
  UserFilesQuota as UserFilesQuotaValue,
} from '@/lib/db/enums';

/** Field catalogues retained for CLI compatibility. Reads use the repositories below. */
export const oauthProviderSelect = {
  id: true,
  createdAt: true,
  updatedAt: true,
  userId: true,
  provider: true,
  username: true,
  oauthId: true,
} as const;

export const userSelect = {
  id: true,
  username: true,
  createdAt: true,
  updatedAt: true,
  role: true,
  view: true,
  oauthProviders: true,
  totpEnabled: true,
  passkeys: true,
  quota: true,
  sessions: true,
} as const;

export const loginUserSelect = { ...userSelect, password: true, totpSecret: true } as const;

export const limitedUserSelect = {
  id: true,
  username: true,
  createdAt: true,
  updatedAt: true,
  role: true,
  view: true,
  quota: true,
} as const;

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

export const userSessionSchema = z.object({
  id: z.string(),
  createdAt: z.date(),
  ua: z.string(),
  client: z.string(),
  device: z.string(),
  userId: z.string(),
});
export type UserSession = z.infer<typeof userSessionSchema>;

export const userQuotaSchema = z.object({
  id: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  filesQuota: z.enum(UserFilesQuota),
  maxBytes: z.string().nullable(),
  maxFiles: z.number().nullable(),
  maxUrls: z.number().nullable(),
  userId: z.string().nullable(),
});
export type UserQuota = z.infer<typeof userQuotaSchema>;

export const userPasskeySchema = z.object({
  id: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  lastUsed: z.date().nullable(),
  name: z.string(),
  reg: z.any(),
  userId: z.string(),
});
export type UserPasskey = z.infer<typeof userPasskeySchema>;

export const oauthProviderSchema = z.object({
  id: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  userId: z.string(),
  provider: z.enum(OAuthProviderTypeEnum),
  username: z.string(),
  oauthId: z.string().nullable(),
});
export type OAuthProvider = z.infer<typeof oauthProviderSchema>;
export type OAuthProviderType = OAuthProvider['provider'];
export const OAuthProviderType = OAuthProviderTypeEnum;

export const userSchema = z.object({
  id: z.string(),
  username: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  role: z.enum(Role),
  view: userViewSchema,
  sessions: z.array(userSessionSchema),
  oauthProviders: z.array(oauthProviderSchema),
  totpEnabled: z.boolean(),
  passkeys: z.array(userPasskeySchema).optional(),
  quota: userQuotaSchema.nullable().optional(),
  avatar: z.string().nullable().optional(),
});
export type User = z.infer<typeof userSchema>;

export const limitedUserSchema = userSchema.omit({
  oauthProviders: true,
  totpEnabled: true,
  passkeys: true,
  sessions: true,
});
export type LimitedUser = z.infer<typeof limitedUserSchema>;
export type LoginUser = User & { password: string | null; totpSecret: string | null };
export type UserRow = typeof users.$inferSelect;
export type UserInsert = typeof users.$inferInsert;
export type UserUpdate = Partial<Omit<UserInsert, 'id' | 'createdAt' | 'updatedAt'>>;
export type DbClient = Database | Transaction;

function publicBase(row: UserRow, includeAvatar: boolean) {
  const base = {
    id: row.id,
    username: row.username,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    role: row.role,
    view: userViewSchema.parse(row.view),
  };
  return includeAvatar ? { ...base, avatar: row.avatar } : base;
}

async function findUserRow(where: SQL | undefined, client: DbClient = db): Promise<UserRow | null> {
  const rows = await client.select().from(users).where(where).limit(1);
  return rows[0] ?? null;
}

async function hydrateLimited(row: UserRow, client: DbClient, includeAvatar = false): Promise<LimitedUser> {
  const quotaRows = await client.select().from(userQuotas).where(eq(userQuotas.userId, row.id)).limit(1);
  return { ...publicBase(row, includeAvatar), quota: quotaRows[0] ?? null };
}

async function hydrateFull(
  row: UserRow,
  client: DbClient,
  options: { avatar?: boolean; login?: boolean } = {},
): Promise<User | LoginUser> {
  const sessions = await client.select().from(userSessions).where(eq(userSessions.userId, row.id));
  const providerRows = await client
    .select({
      id: oauthProviders.id,
      createdAt: oauthProviders.createdAt,
      updatedAt: oauthProviders.updatedAt,
      userId: oauthProviders.userId,
      provider: oauthProviders.provider,
      username: oauthProviders.username,
      oauthId: oauthProviders.oauthId,
    })
    .from(oauthProviders)
    .where(eq(oauthProviders.userId, row.id));
  const passkeys = await client.select().from(userPasskeys).where(eq(userPasskeys.userId, row.id));
  const quotaRows = await client.select().from(userQuotas).where(eq(userQuotas.userId, row.id)).limit(1);

  const result: User = {
    ...publicBase(row, !!options.avatar),
    sessions,
    oauthProviders: providerRows,
    totpEnabled: !!row.totpSecret,
    passkeys,
    quota: quotaRows[0] ?? null,
  };
  return options.login ? { ...result, password: row.password, totpSecret: row.totpSecret } : result;
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
  const row = await findUserRowById(id, client);
  return row ? ((await hydrateFull(row, client, options)) as User) : null;
}

export async function findFullUserByUsername(username: string, client: DbClient = db) {
  const row = await findUserRowByUsername(username, client);
  return row ? ((await hydrateFull(row, client)) as User) : null;
}

export async function findLoginUserByUsername(
  username: string,
  client: DbClient = db,
): Promise<LoginUser | null> {
  const row = await findUserRowByUsername(username, client);
  return row ? ((await hydrateFull(row, client, { login: true })) as LoginUser) : null;
}

export async function findFullUserByToken(token: string, client: DbClient = db) {
  const row = await findUserRow(eq(users.token, token), client);
  return row ? ((await hydrateFull(row, client)) as User) : null;
}

export async function findLimitedUserByToken(token: string, client: DbClient = db) {
  const row = await findUserRow(eq(users.token, token), client);
  return row ? hydrateLimited(row, client) : null;
}

async function findRowBySessionId(sessionId: string, client: DbClient) {
  const rows = await client
    .select({ user: users })
    .from(users)
    .innerJoin(userSessions, eq(userSessions.userId, users.id))
    .where(eq(userSessions.id, sessionId))
    .limit(1);
  return rows[0]?.user ?? null;
}

export async function findFullUserBySessionId(sessionId: string, client: DbClient = db) {
  const row = await findRowBySessionId(sessionId, client);
  return row ? ((await hydrateFull(row, client)) as User) : null;
}

export async function findLimitedUserBySessionId(sessionId: string, client: DbClient = db) {
  const row = await findRowBySessionId(sessionId, client);
  return row ? hydrateLimited(row, client) : null;
}

export async function findLimitedUserById(
  id: string,
  client: DbClient = db,
  options: { avatar?: boolean } = {},
) {
  const row = await findUserRowById(id, client);
  return row ? hydrateLimited(row, client, !!options.avatar) : null;
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
  const rows = await client
    .select()
    .from(users)
    .where(conditions.length ? and(...conditions) : undefined);

  const result: LimitedUser[] = [];
  for (const row of rows) result.push(await hydrateLimited(row, client, !!options.avatar));
  return result;
}

export async function createFullUser(data: UserInsert, client: DbClient = db): Promise<User> {
  const rows = await client.insert(users).values(data).returning();
  if (!rows[0]) throw new Error('User insert did not return a row');
  return (await hydrateFull(rows[0], client)) as User;
}

export async function createLimitedUser(
  data: UserInsert,
  client: DbClient = db,
  options: { avatar?: boolean } = {},
) {
  const rows = await client.insert(users).values(data).returning();
  if (!rows[0]) throw new Error('User insert did not return a row');
  return hydrateLimited(rows[0], client, !!options.avatar);
}

export async function updateFullUser(id: string, data: UserUpdate, client: DbClient = db) {
  const rows = await client.update(users).set(data).where(eq(users.id, id)).returning();
  return rows[0] ? ((await hydrateFull(rows[0], client)) as User) : null;
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
  const rows = await client.update(users).set(data).where(eq(users.id, id)).returning();
  return rows[0] ? hydrateLimited(rows[0], client, !!options.avatar) : null;
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
  return client
    .select()
    .from(users)
    .where(id ? eq(users.id, id) : undefined);
}
