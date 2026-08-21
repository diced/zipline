import { db, type DbClient } from '@/lib/db';
import type { Role } from '@/lib/db/enums';
import { users } from '@/lib/db/schema';
import { eq, isNotNull } from 'drizzle-orm';
import { createSelectSchema } from 'drizzle-orm/zod';
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

export type User = z.infer<typeof userSchema>;
export type LimitedUser = z.infer<typeof limitedUserSchema>;
type LoginUser = User & Pick<typeof users.$inferSelect, 'password' | 'totpSecret'>;

type UserInsert = typeof users.$inferInsert;
export type UserUpdate = Partial<Omit<UserInsert, 'id' | 'createdAt' | 'updatedAt'>>;
type UserWhere = Partial<Pick<typeof users.$inferSelect, 'id' | 'username' | 'token'>>;

const publicUserColumns = {
  id: true,
  username: true,
  createdAt: true,
  updatedAt: true,
  role: true,
  view: true,
} as const;

const publicUserColumnsWithAvatar = {
  ...publicUserColumns,
  avatar: true,
} as const;

const totpEnabled = (user: typeof users) => isNotNull(user.totpSecret).mapWith(Boolean);

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

function parseView<T extends { view: unknown }>(row: T) {
  return { ...row, view: userViewSchema.parse(row.view) };
}

async function findUser(where: UserWhere, client: DbClient): Promise<User | null> {
  const row = await client.query.users.findFirst({
    columns: publicUserColumns,
    extras: { totpEnabled },
    where,
    with: userRelations,
  });
  return row ? parseView(row) : null;
}

export async function getUserIdentity(id: string, client: DbClient = db) {
  return (
    (await client.query.users.findFirst({
      columns: { id: true, username: true, role: true },
      where: { id },
    })) ?? null
  );
}

export async function usernameExists(username: string, client: DbClient = db) {
  return !!(await client.query.users.findFirst({ columns: { id: true }, where: { username } }));
}

export async function getUser(id: string, client: DbClient = db) {
  return findUser({ id }, client);
}

export async function getLoginUser(username: string, client: DbClient = db): Promise<LoginUser | null> {
  const row = await client.query.users.findFirst({
    columns: { ...publicUserColumns, password: true, totpSecret: true },
    extras: { totpEnabled },
    where: { username },
    with: userRelations,
  });
  return row ? parseView(row) : null;
}

export async function getUserByToken(token: string, client: DbClient = db) {
  return findUser({ token }, client);
}

export async function getUserBySession(sessionId: string, client: DbClient = db): Promise<User | null> {
  const session = await client.query.userSessions.findFirst({
    columns: {},
    where: { id: sessionId },
    with: {
      user: {
        columns: publicUserColumns,
        extras: { totpEnabled },
        with: userRelations,
      },
    },
  });
  return session ? parseView(session.user) : null;
}

export async function getUserSummary(id: string, client: DbClient = db) {
  const row = await client.query.users.findFirst({
    columns: publicUserColumns,
    where: { id },
    with: { quota: true },
  });
  return row ? parseView(row) : null;
}

export async function listUsers(
  options: { roles?: readonly Role[]; excludeId?: string; avatar?: boolean } = {},
  client: DbClient = db,
): Promise<LimitedUser[]> {
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
  return rows.map(parseView);
}

export async function listUserDetails(
  options: { id?: string; avatar?: boolean } = {},
  client: DbClient = db,
): Promise<User[]> {
  const rows = await client.query.users.findMany({
    columns: options.avatar ? publicUserColumnsWithAvatar : publicUserColumns,
    extras: { totpEnabled },
    where: options.id ? { id: options.id } : undefined,
    with: userRelations,
  });
  return rows.map(parseView);
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
