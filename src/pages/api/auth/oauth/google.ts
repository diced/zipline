import config from 'lib/config';
import Logger from 'lib/logger';
import { OAuthQuery, OAuthResponse, withOAuth } from 'lib/middleware/withOAuth';
import { withZipline } from 'lib/middleware/withZipline';
import { google_auth } from 'lib/oauth';
import { getBase64URLFromURL, notNull } from 'lib/util';

async function handler({ code, state, host }: OAuthQuery, logger: Logger): Promise<OAuthResponse> {
  if (!config.features.oauth_registration)
    return {
      error_code: 403,
      error: 'oauth registration is disabled',
    };

  if (!notNull(config.oauth.google_client_id, config.oauth.google_client_secret)) {
    logger.error('Google OAuth is not configured');
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

  const body = new URLSearchParams({
    code,
    client_id: config.oauth.google_client_id,
    client_secret: config.oauth.google_client_secret,
    redirect_uri: `${config.core.https ? 'https' : 'http'}://${host}/api/auth/oauth/google`,
    grant_type: 'authorization_code',
  });

  const resp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });

  const text = await resp.text();
  logger.debug(`oauth https://oauth2.googleapis.com/token -> body(${body}) resp(${text})`);

  if (!resp.ok) return { error: 'invalid request' };

  const json = JSON.parse(text);

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
