import { withZipline } from 'lib/middleware/withZipline';
import { getBase64URLFromURL, notNull } from 'lib/util';
import Logger from 'lib/logger';
import config from 'lib/config';
import { google_auth } from 'lib/oauth';
import { withOAuth, OAuthResponse, OAuthQuery } from 'lib/middleware/withOAuth';

async function handler({ code, state, host }: OAuthQuery): Promise<OAuthResponse> {
  if (!config.features.oauth_registration)
    return {
      error_code: 403,
      error: 'oauth registration is disabled',
    };

  if (!notNull(config.oauth.google_client_id, config.oauth.google_client_secret)) {
    Logger.get('oauth').error('Google OAuth is not configured');
    return {
      error_code: 401,
      error: 'Google OAuth is not configured',
    };
  }

  if (!code)
    return {
      redirect: google_auth.oauth_url(
        config.oauth.google_client_id,
        `${config.core.https ? 'https' : 'http'}://${host}`,
        state
      ),
    };

  const resp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      code,
      client_id: config.oauth.google_client_id,
      client_secret: config.oauth.google_client_secret,
      redirect_uri: `${config.core.https ? 'https' : 'http'}://${host}/api/auth/oauth/google`,
      grant_type: 'authorization_code',
    }),
  });

  if (!resp.ok) return { error: 'invalid request' };

  const json = await resp.json();

  if (!json.access_token) return { error: 'no access_token in response' };

  const userJson = await google_auth.oauth_user(json.access_token);
  if (!userJson) return { error: 'invalid user request' };

  const avatarBase64 = await getBase64URLFromURL(userJson?.photos[0]?.url);

  return {
    username: userJson.names[0].displayName,
    avatar: avatarBase64,
    access_token: json.access_token,
    refresh_token: json.refresh_token,
  };
}

export default withZipline(withOAuth('google', handler));
