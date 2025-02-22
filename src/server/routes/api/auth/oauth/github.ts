import { fetchToDataURL } from '@/lib/base64';
import { config } from '@/lib/config';
import { encrypt } from '@/lib/crypto';
import Logger from '@/lib/logger';
import enabled from '@/lib/oauth/enabled';
import { githubAuth } from '@/lib/oauth/providerUtil';
import { OAuthQuery, OAuthResponse } from '@/server/plugins/oauth';
import fastifyPlugin from 'fastify-plugin';

async function githubOauth({ code, state }: OAuthQuery, logger: Logger): Promise<OAuthResponse> {
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

  if (!code) {
    const linkState = encrypt('link', config.core.secret);

    return {
      redirect: githubAuth.url(
        config.oauth.github.clientId!,
        state === 'link' ? linkState : undefined,
        config.oauth.github.redirectUri ?? undefined,
      ),
    };
  }

  const body = JSON.stringify({
    client_id: config.oauth.github.clientId!,
    client_secret: config.oauth.github.clientSecret!,
    code,
  });

  logger.debug('github oauth request', {
    body: body.toString(),
  });

  const res = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    body,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
  });

  const isJson = res.headers.get('content-type')?.startsWith('application/json');

  if (!isJson && !res.ok)
    return {
      error: 'Failed to fetch access token',
    };

  const json = await res.json();

  if (json.error) {
    logger.error('failed to fetch access token', {
      error: json.error_description ?? json.error_uri ?? json.error ?? 'unknown gh error',
    });
    logger.debug('failed to fetch access token', { json, status: res.status });

    return { error: 'there was an error while processing github request' };
  }

  if (!json.access_token) return { error: 'No access token in response' };

  const userJson = await githubAuth.user(json.access_token);
  if (!userJson) return { error: 'Failed to fetch user' };

  logger.debug('user', { user: userJson });

  return {
    access_token: json.access_token,
    refresh_token: json.refresh_token,
    username: userJson.login ?? userJson.name,
    user_id: String(userJson.id),
    avatar: await fetchToDataURL(userJson.avatar_url),
  };
}

export const PATH = '/api/auth/oauth/github';
export default fastifyPlugin(
  (server, _, done) => {
    server.get(PATH, async (req, res) => {
      return req.oauthHandle(res, 'GITHUB', githubOauth);
    });

    done();
  },
  { name: PATH },
);
