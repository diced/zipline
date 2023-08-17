import { RegistrationResponseJSON } from '@github/webauthn-json/dist/types/browser-ponyfill';
import { OAuthProvider, UserPasskey } from '@prisma/client';
import { z } from 'zod';

export type User = {
  id: string;
  username: string;
  createdAt: Date;
  updatedAt: Date;
  role: 'USER' | 'ADMIN' | 'SUPERADMIN';
  view: UserViewSettings;

  oauthProviders: OAuthProvider[];

  totpSecret?: string | null;
  passkeys: UserPasskey[];

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
};

export type UserViewSettings = z.infer<typeof userViewSchema>;
export const userViewSchema = z
  .object({
    enabled: z.boolean().nullish(),
    align: z.enum(['left', 'center', 'right']).nullish(),
    showMimetype: z.boolean().nullish(),
    content: z.string().nullish(),
    embed: z.boolean().nullish(),
    embedTitle: z.string().nullish(),
    embedDescription: z.string().nullish(),
    embedColor: z.string().nullish(),
    embedSiteName: z.string().nullish(),
  })
  .partial();