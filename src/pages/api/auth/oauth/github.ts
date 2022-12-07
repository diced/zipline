import config from 'lib/config';
import Logger from 'lib/logger';
import { OAuthQuery, OAuthResponse, withOAuth } from 'lib/middleware/withOAuth';
import { withZipline } from 'lib/middleware/withZipline';
import { github_auth } from 'lib/oauth';
import { getBase64URLFromURL, notNull } from 'lib/util';

async function handler({ code, state }: OAuthQuery, logger: Logger): Promise<OAuthResponse> {
  if (!config.features.oauth_registration)
    return {
      error_code: 403,
      error: 'oauth registration is disabled',
    };

  if (!notNull(config.oauth.github_client_id, config.oauth.github_client_secret)) {
    logger.error('GitHub OAuth is not configured');
    return {
      error_code: 401,
      error: 'GitHub OAuth is not configured',
    };
  }

  if (!code)
    return {
      redirect: github_auth.oauth_url(config.oauth.github_client_id, state),
    };

  const body = JSON.stringify({
    client_id: config.oauth.github_client_id,
    client_secret: config.oauth.github_client_secret,
    code,
  });

  const resp = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body,
  });

  const text = await resp.text();
  logger.debug(`oauth https://github.com/login/oauth/access_token -> body(${body}) resp(${text})`);

  if (!resp.ok) return { error: 'invalid request' };

  const json = JSON.parse(text);

  if (!json.access_token) return { error: 'no access_token in response' };

  const userJson = await github_auth.oauth_user(json.access_token);
  if (!userJson) return { error: 'invalid user request' };

  const avatarBase64 = await getBase64URLFromURL(userJson.avatar_url);

  return {
    username: userJson.login,
    user_id: userJson.id.toString(),
    avatar: avatarBase64,
    access_token: json.access_token,
  };
}

export default withZipline(withOAuth('github', handler));
