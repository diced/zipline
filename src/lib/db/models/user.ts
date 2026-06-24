import { z } from 'zod';

export const userSelect = {
  id: true,
  username: true,
  createdAt: true,
  updatedAt: true,
  role: true,
  view: true,
  oauthProviders: true,
  totpSecret: true,
  passkeys: true,
  quota: true,
  sessions: true,
};

export const limitedUserSelect = {
  id: true,
  username: true,
  createdAt: true,
  updatedAt: true,
  role: true,
  view: true,
  quota: true,
};

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
  filesQuota: z.enum(['BY_BYTES', 'BY_FILES']),
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
  provider: z.enum(['DISCORD', 'GOOGLE', 'GITHUB', 'OIDC']),
  username: z.string(),
  accessToken: z.string(),
  refreshToken: z.string().nullable(),
  oauthId: z.string().nullable(),
});

export type OAuthProvider = z.infer<typeof oauthProviderSchema>;
export type OAuthProviderType = OAuthProvider['provider'];

export const userSchema = z.object({
  id: z.string(),
  username: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  role: z.enum(['USER', 'ADMIN', 'SUPERADMIN']),
  view: userViewSchema,

  sessions: z.array(userSessionSchema),
  oauthProviders: z.array(oauthProviderSchema),

  totpSecret: z.string().nullable().optional(),
  passkeys: z.array(userPasskeySchema).optional(),

  quota: userQuotaSchema.nullable().optional(),

  avatar: z.string().nullable().optional(),
  password: z.string().nullable().optional(),
  token: z.string().nullable().optional(),
});

export type User = z.infer<typeof userSchema>;

export const limitedUserSchema = userSchema.omit({
  oauthProviders: true,
  totpSecret: true,
  passkeys: true,
  sessions: true,
  password: true,
  token: true,
});

export type LimitedUser = z.infer<typeof limitedUserSchema>;
