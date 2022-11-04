import { withZipline } from 'lib/middleware/withZipline';
import { getBase64URLFromURL, notNull } from 'lib/util';
import Logger from 'lib/logger';
import config from 'lib/config';
import { github_auth } from 'lib/oauth';
import { withOAuth, OAuthResponse, OAuthQuery } from 'lib/middleware/withOAuth';

async function handler({ code, state }: OAuthQuery): Promise<OAuthResponse> {
  if (!config.features.oauth_registration)
    return {
      error_code: 403,
      error: 'oauth registration is disabled',
    };

  if (!notNull(config.oauth.github_client_id, config.oauth.github_client_secret)) {
    Logger.get('oauth').error('GitHub OAuth is not configured');
    return {
      error_code: 401,
      error: 'GitHub OAuth is not configured',
    };
  }

  if (!code)
    return {
      redirect: github_auth.oauth_url(config.oauth.github_client_id, state),
    };

  const resp = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      client_id: config.oauth.github_client_id,
      client_secret: config.oauth.github_client_secret,
      code,
    }),
  });

  if (!resp.ok) return { error: 'invalid request' };

  const json = await resp.json();

  if (!json.access_token) return { error: 'no access_token in response' };

  const userJson = await github_auth.oauth_user(json.access_token);
  if (!userJson) return { error: 'invalid user request' };

  const avatarBase64 = await getBase64URLFromURL(userJson.avatar_url);

  return {
    username: userJson.login,
    avatar: avatarBase64,
    access_token: json.access_token,
  };
}

export default withZipline(withOAuth('github', handler));
