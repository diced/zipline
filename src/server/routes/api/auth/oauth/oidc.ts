import { ApiError, RedirectError } from '@/lib/api/errors';
import { fetchToDataURL } from '@/lib/base64';
import { config } from '@/lib/config';
import Logger from '@/lib/logger';
import enabled from '@/lib/oauth/enabled';
import { generatePKCEChallenge, generatePKCEVerifier } from '@/lib/oauth/pkce';
import { oidcAuthorizeURL, oidcUser } from '@/lib/oauth/providers';
import { generateOAuthState } from '@/lib/oauth/state';
import { OAuthQuery, OAuthResponse } from '@/server/plugins/oauth';
import typedPlugin from '@/server/typedPlugin';

async function oidcOauth({ code, host, state, session }: OAuthQuery, logger: Logger): Promise<OAuthResponse> {
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
        redirectUri: config.oauth.oidc.redirectUri!,
        authorizeUrl: config.oauth.oidc.authorizeUrl!,
        codeChallenge,
      }),
    );
  }

  const pkceVerifier = session.pkceVerifier;
  if (pkceVerifier) {
    delete session.pkceVerifier;
    await session.save();
  }

  const body = new URLSearchParams({
    client_id: config.oauth.oidc.clientId!,
    client_secret: config.oauth.oidc.clientSecret!,
    grant_type: 'authorization_code',
    code,
    redirect_uri:
      config.oauth.oidc.redirectUri ??
      `${config.core.returnHttpsUrls ? 'https' : 'http'}://${host}/api/auth/oauth/oidc`,
  });
  if (pkceVerifier) {
    body.set('code_verifier', pkceVerifier);
  }

  logger.debug('oidc oauth request', {
    body: body.toString(),
  });

  const res = await fetch(config.oauth.oidc.tokenUrl!, {
    method: 'POST',
    body,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });

  if (!res.ok) {
    const text = await res.text();
    logger.debug('oidc oauth failed with a non 200 status code', { status: res.status, text });

    throw new ApiError(6004);
  }

  const json = await res.json();
  if (!json.access_token) throw new ApiError(6005);

  const userJson = await oidcUser({
    accessToken: json.access_token,
    userInfoUrl: config.oauth.oidc.userinfoUrl!,
  });
  if (!userJson) throw new ApiError(6007);

  logger.debug('user', { userinfo: userJson });

  return {
    access_token: json.access_token,
    refresh_token: json.refresh_token || null,
    // many different properties, so we are just gonna go down the list
    username:
      userJson.preferred_username ?? userJson.name ?? userJson.given_name ?? userJson.email ?? userJson.sub,
    user_id: userJson.sub,
    avatar: await fetchToDataURL(userJson.picture ?? null),
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
