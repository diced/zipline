import type { OAuthProviderType } from '@prisma/client';
import { User } from '../db/models/user';

export function findProvider(
  provider: OAuthProviderType,
  providers: User['oauthProviders']
): User['oauthProviders'][0] | undefined {
  return providers.find((p) => p.provider === provider);
}
