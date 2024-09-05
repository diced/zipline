import { config } from '@/lib/config';
import Logger from '@/lib/logger';
import { combine } from '@/lib/middleware/combine';
import { method } from '@/lib/middleware/method';
import enabled from '@/lib/oauth/enabled';
import { oidcAuth } from '@/lib/oauth/providerUtil';
import { OAuthQuery, OAuthResponse, withOAuth } from '@/lib/oauth/withOAuth';

// thanks to @danejur for this https://github.com/diced/zipline/pull/372
async function handler({ code, state, host }: OAuthQuery, _logger: Logger): Promise<OAuthResponse> {
  if (!config.features.oauthRegistration)
    return {
      error: 'OAuth registration is disabled.',
      error_code: 403,
    };

  const { oidc: oidcEnabled } = enabled(config);

  if (!oidcEnabled)
    return {
      error: 'OpenID Connect OAuth is not configured.',
      error_code: 401,
    };

  if (!code)
    return {
      redirect: oidcAuth.url(
        config.oauth.oidc.clientId!,
        `${config.core.returnHttpsUrls ? 'https' : 'http'}://${host}`,
        config.oauth.oidc.authorizeUrl!,
        state,
      ),
    };

  const body = new URLSearchParams({
    client_id: config.oauth.oidc.clientId!,
    client_secret: config.oauth.oidc.clientSecret!,
    grant_type: 'authorization_code',
    code,
    redirect_uri: `${config.core.returnHttpsUrls ? 'https' : 'http'}://${host}/api/auth/oauth/oidc`,
  });

  const res = await fetch(config.oauth.oidc.tokenUrl!, {
    method: 'POST',
    body,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });

  if (!res.ok)
    return {
      error: 'Failed to fetch access token',
    };

  const json = await res.json();
  if (!json.access_token) return { error: 'No access token in response' };
  if (!json.refresh_token) return { error: 'No refresh token in response' };

  const userJson = await oidcAuth.user(json.access_token, config.oauth.oidc.userinfoUrl!);
  if (!userJson) return { error: 'Failed to fetch user' };

  return {
    access_token: json.access_token,
    refresh_token: json.refresh_token,
    username: userJson.preferred_username,
    user_id: userJson.sub,
  };
}

export default combine([method(['GET'])], withOAuth('OIDC', handler));
