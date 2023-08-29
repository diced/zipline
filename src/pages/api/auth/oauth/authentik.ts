import config from 'lib/config';
import Logger from 'lib/logger';
import { OAuthQuery, OAuthResponse, withOAuth } from 'lib/middleware/withOAuth';
import { withZipline } from 'lib/middleware/withZipline';
import { authentik_auth } from 'lib/oauth';
import { notNullArray } from 'lib/util';

async function handler({ code, state, host }: OAuthQuery, logger: Logger): Promise<OAuthResponse> {
  if (!config.features.oauth_registration)
    return {
      error_code: 403,
      error: 'oauth registration is disabled',
    };

  if (
    !notNullArray([
      config.oauth?.authentik_client_id,
      config.oauth?.authentik_client_secret,
      config.oauth?.authentik_authorize_url,
      config.oauth?.authentik_userinfo_url,
    ])
  ) {
    logger.error('Authentik OAuth is not configured');
    return {
      error_code: 401,
      error: 'Authentik OAuth is not configured',
    };
  }

  if (!code)
    return {
      redirect: authentik_auth.oauth_url(
        config.oauth.authentik_client_id,
        `${config.core.return_https ? 'https' : 'http'}://${host}`,
        config.oauth.authentik_authorize_url,
        state
      ),
    };

  const body = new URLSearchParams({
    code,
    client_id: config.oauth.authentik_client_id,
    client_secret: config.oauth.authentik_client_secret,
    redirect_uri: `${config.core.return_https ? 'https' : 'http'}://${host}/api/auth/oauth/authentik`,
    grant_type: 'authorization_code',
  });

  const resp = await fetch(config.oauth.authentik_token_url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });

  const text = await resp.text();
  logger.debug(`oauth ${config.oauth.authentik_token_url} -> body(${body}) resp(${text})`);

  if (!resp.ok) return { error: 'invalid request' };

  const json = JSON.parse(text);

  if (!json.access_token) return { error: 'no access_token in response' };

  const userJson = await authentik_auth.oauth_user(json.access_token, config.oauth.authentik_userinfo_url);
  if (!userJson) return { error: 'invalid user request' };

  return {
    username: userJson.preferred_username,
    user_id: userJson.sub,
    access_token: json.access_token,
    refresh_token: json.refresh_token,
  };
}

export default withZipline(withOAuth('authentik', handler));
