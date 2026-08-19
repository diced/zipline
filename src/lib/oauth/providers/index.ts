import type { OAuthProviderType } from '@/lib/db/enums';

export function findProvider<T extends { provider: OAuthProviderType }>(
  provider: OAuthProviderType,
  providers: T[],
): T | undefined {
  return providers.find((p) => p.provider === provider);
}

export async function fetchUserInfo({ userInfoUrl, accessToken }: OAuthUserInfoOptions): Promise<any | null> {
  const res = await fetch(userInfoUrl!, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) return null;

  return res.json();
}

export type OAuthOptions = {
  clientId: string;
  origin: string;
  state?: string;
  redirectUri: string;

  authorizeUrl?: string;

  codeChallenge?: string;
};

export type OAuthUserInfoOptions = {
  accessToken: string;
  userInfoUrl?: string;
};

export { discordAuthorizeURL, discordUser } from './discord';
export { githubAuthorizeURL, githubUser } from './github';
export { googleAuthorizeURL, googleUser } from './google';
export { oidcAuthorizeURL, oidcUser } from './oidc';
