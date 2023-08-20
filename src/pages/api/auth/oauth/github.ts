import { fetchToDataURL } from '@/lib/base64';
import { config } from '@/lib/config';
import Logger from '@/lib/logger';
import { combine } from '@/lib/middleware/combine';
import { method } from '@/lib/middleware/method';
import enabled from '@/lib/oauth/enabled';
import { githubAuth } from '@/lib/oauth/providerUtil';
import { OAuthQuery, OAuthResponse, withOAuth } from '@/lib/oauth/withOAuth';

async function handler({ code, state }: OAuthQuery, logger: Logger): Promise<OAuthResponse> {
  if (!config.features.oauthRegistration)
    return {
      error: 'OAuth registration is disabled.',
      error_code: 403,
    };

  const { github: githubEnabled } = enabled(config);

  if (!githubEnabled)
    return {
      error: 'GitHub OAuth is not configured.',
      error_code: 401,
    };

  if (!code)
    return {
      redirect: githubAuth.url(config.oauth.github.clientId!, state),
    };

  const body = JSON.stringify({
    client_id: config.oauth.github.clientId!,
    client_secret: config.oauth.github.clientSecret!,
    code,
  });

  logger.debug('github oauth request', {
    body,
  });

  const res = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    body,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
  });

  if (!res.ok)
    return {
      error: 'Failed to fetch access token',
    };

  const json = await res.json();

  if (!json.access_token) return { error: 'No access token in response' };

  const userJson = await githubAuth.user(json.access_token);
  if (!userJson) return { error: 'Failed to fetch user' };

  return {
    access_token: json.access_token,
    refresh_token: json.refresh_token,
    username: userJson.login ?? userJson.name,
    user_id: String(userJson.id),
    avatar: await fetchToDataURL(userJson.avatar_url),
  };
}

export default combine([method(['GET'])], withOAuth('GITHUB', handler));
