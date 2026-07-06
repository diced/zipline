import { ApiError, RedirectError } from '@/lib/api/errors';
import { fetchToDataURL } from '@/lib/base64';
import { config } from '@/lib/config';
import Logger from '@/lib/logger';
import enabled from '@/lib/oauth/enabled';
import { githubAuthorizeURL, githubUser } from '@/lib/oauth/providers';
import { generateOAuthState } from '@/lib/oauth/state';
import { OAuthQuery, OAuthResponse } from '@/server/plugins/oauth';
import typedPlugin from '@/server/typedPlugin';

async function githubOauth({ code, host, state, session }: OAuthQuery, logger: Logger): Promise<OAuthResponse> {
  if (!config.features.oauthRegistration) throw new ApiError(3016);

  const { github: githubEnabled } = enabled(config);

  if (!githubEnabled) throw new ApiError(2003, 'GitHub OAuth is not configured.');

  if (!code) {
    throw new RedirectError(
      githubAuthorizeURL({
        clientId: config.oauth.github.clientId!,
        state: await generateOAuthState(session, state === 'link' ? 'link' : 'default'),
        redirectUri: config.oauth.github.redirectUri!,
        origin: `${config.core.returnHttpsUrls ? 'https' : 'http'}://${host}`,
      }),
    );
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

  if (!isJson && !res.ok) throw new ApiError(6004);

  const json = await res.json();

  if (json.error) {
    logger.error('failed to fetch access token', {
      error: json.error_description ?? json.error_uri ?? json.error ?? 'unknown gh error',
    });
    logger.debug('failed to fetch access token', { json, status: res.status });

    throw new ApiError(6008);
  }

  if (!json.access_token) throw new ApiError(6005);

  const userJson = await githubUser({
    accessToken: json.access_token,
  });
  if (!userJson) throw new ApiError(6007);

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
export default typedPlugin(
  async (server) => {
    server.get(PATH, async (req, res) => {
      return req.oauthHandle(res, 'GITHUB', githubOauth);
    });
  },
  { name: PATH },
);
