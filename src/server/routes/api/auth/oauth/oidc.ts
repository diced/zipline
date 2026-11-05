import { ApiError, RedirectError } from '@/lib/api/errors';
import { config } from '@/lib/config';
import Logger from '@/lib/logger';
import { fetchOidcAvatar } from '@/lib/oauth/avatar';
import enabled from '@/lib/oauth/enabled';
import { generatePKCEChallenge, generatePKCEVerifier } from '@/lib/oauth/pkce';
import { oidcAuthorizeURL, oidcUser } from '@/lib/oauth/providers';
import { generateOAuthState } from '@/lib/oauth/state';
import { OAuthQuery, OAuthResponse } from '@/server/plugins/oauth';
import typedPlugin from '@/server/typedPlugin';

async function oidcOauth(
  { code, host, state, session, pkceVerifier }: OAuthQuery,
  logger: Logger,
): Promise<OAuthResponse> {
  if (!config.features.oauthRegistration) throw new ApiError(3016);

  const { oidc: oidcEnabled } = enabled(config);

  if (!oidcEnabled) throw new ApiError(2003, 'OpenID Connect OAuth is not configured.');

  if (!code) {
    const pkceVerifier = generatePKCEVerifier();
    const codeChallenge = generatePKCEChallenge(pkceVerifier);

    session.pkceVerifier = pkceVerifier;
    const oauthState = await generateOAuthState(session, state === 'link' ? 'link' : 'default');

    throw new RedirectError(
      oidcAuthorizeURL({
        clientId: config.oauth.oidc.clientId!,
        origin: `${config.core.returnHttpsUrls ? 'https' : 'http'}://${host}`,
        state: oauthState,
        redirectUri: config.oauth.oidc.redirectUri,
        authorizeUrl: config.oauth.oidc.authorizeUrl!,
        codeChallenge,
      }),
    );
  }

  if (!pkceVerifier) throw new ApiError(1064);

  const body = new URLSearchParams({
    client_id: config.oauth.oidc.clientId!,
    client_secret: config.oauth.oidc.clientSecret!,
    grant_type: 'authorization_code',
    code,
    redirect_uri:
      config.oauth.oidc.redirectUri ??
      `${config.core.returnHttpsUrls ? 'https' : 'http'}://${host}/api/auth/oauth/oidc`,
    code_verifier: pkceVerifier,
  });

  const res = await fetch(config.oauth.oidc.tokenUrl!, {
    method: 'POST',
    body,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });

  if (!res.ok) {
    logger.debug('oidc oauth failed with a non 200 status code', { status: res.status });

    throw new ApiError(6004);
  }

  const json = await res.json().catch(() => null);
  if (!json || typeof json !== 'object' || json.error) throw new ApiError(6008);
  if (typeof json.access_token !== 'string' || !json.access_token) throw new ApiError(6005);

  const userJson = await oidcUser({
    accessToken: json.access_token,
    userInfoUrl: config.oauth.oidc.userinfoUrl!,
  });
  if (!userJson || typeof userJson.sub !== 'string' || !userJson.sub) throw new ApiError(6007);

  logger.debug('user', { userinfo: userJson });

  return {
    access_token: json.access_token,
    id_token: typeof json.id_token === 'string' ? json.id_token : undefined,
    refresh_token:
      typeof json.refresh_token === 'string' && json.refresh_token ? json.refresh_token : undefined,
    username: [
      userJson.preferred_username,
      userJson.name,
      userJson.given_name,
      userJson.email,
      userJson.sub,
    ].find((name) => typeof name === 'string' && name.trim()),
    user_id: userJson.sub,
    avatar: await fetchOidcAvatar(userJson.picture, config.oauth.oidc.userinfoUrl!),
  };
}

export const PATH = '/api/auth/oauth/oidc';
export default typedPlugin(
  async (server) => {
    server.get(PATH, async (req, res) => {
      return req.oauthHandle(res, 'OIDC', oidcOauth);
    });
  },
  { name: PATH },
);
