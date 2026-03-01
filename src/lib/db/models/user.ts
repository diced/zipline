import { OAuthProvider, UserPasskey, UserQuota, UserSession } from '@/prisma/client';
import { z } from 'zod';

export type User = {
  id: string;
  username: string;
  createdAt: Date;
  updatedAt: Date;
  role: 'USER' | 'ADMIN' | 'SUPERADMIN';
  view: UserViewSettings;

  sessions: UserSession[];

  oauthProviders: OAuthProvider[];

  totpSecret?: string | null;
  passkeys?: UserPasskey[];

  quota?: UserQuota | null;

  avatar?: string | null;
  password?: string | null;
  token?: string | null;
};

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

export type UserViewSettings = z.infer<typeof userViewSchema>;
export const userViewSchema = z
  .object({
    enabled: z.boolean().nullish(),
    align: z.enum(['left', 'center', 'right']).nullish(),
    showMimetype: z.boolean().nullish(),
    showTags: z.boolean().nullish(),
    showFolder: z.boolean().nullish(),
    content: z.string().nullish(),
    embed: z.boolean().nullish(),
    embedTitle: z.string().nullish(),
    embedDescription: z.string().nullish(),
    embedColor: z.string().nullish(),
    embedSiteName: z.string().nullish(),
  })
  .partial();

export const userSchema = z.object({
  id: z.string(),
  username: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  role: z.enum(['USER', 'ADMIN', 'SUPERADMIN']),
  view: userViewSchema,

  sessions: z.array(z.any()),
  oauthProviders: z.array(z.any()),

  totpSecret: z.string().nullable().optional(),
  passkeys: z.array(z.any()).optional(),

  quota: z.any().nullable().optional(),

  avatar: z.string().nullable().optional(),
  password: z.string().nullable().optional(),
  token: z.string().nullable().optional(),
});
