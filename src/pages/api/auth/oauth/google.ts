import { fetchToDataURL } from '@/lib/base64';
import { config } from '@/lib/config';
import Logger from '@/lib/logger';
import { combine } from '@/lib/middleware/combine';
import { method } from '@/lib/middleware/method';
import enabled from '@/lib/oauth/enabled';
import { googleAuth } from '@/lib/oauth/providerUtil';
import { OAuthQuery, OAuthResponse, withOAuth } from '@/lib/oauth/withOAuth';

async function handler({ code, state, host }: OAuthQuery, logger: Logger): Promise<OAuthResponse> {
  if (!config.features.oauthRegistration)
    return {
      error: 'OAuth registration is disabled.',
      error_code: 403,
    };

  const { google: googleEnabled } = enabled(config);

  if (!googleEnabled)
    return {
      error: 'Google OAuth is not configured.',
      error_code: 401,
    };

  if (!code)
    return {
      redirect: googleAuth.url(
        config.oauth.google.clientId!,
        `${config.core.returnHttpsUrls ? 'https' : 'http'}://${host}`,
        state
      ),
    };

  const body = new URLSearchParams({
    client_id: config.oauth.google.clientId!,
    client_secret: config.oauth.google.clientSecret!,
    grant_type: 'authorization_code',
    code,
    redirect_uri: `${config.core.returnHttpsUrls ? 'https' : 'http'}://${host}/api/auth/oauth/google`,
    access_type: 'offline',
  });

  const res = await fetch('https://oauth2.googleapis.com/token', {
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

  const userJson = await googleAuth.user(json.access_token);
  if (!userJson) return { error: 'Failed to fetch user' };

  return {
    access_token: json.access_token,
    refresh_token: json.refresh_token,
    username: userJson.given_name,
    user_id: userJson.id,
    avatar: await fetchToDataURL(userJson.picture),
  };
}

export default combine([method(['GET'])], withOAuth('GOOGLE', handler));
