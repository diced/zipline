import { ApiError, RedirectError } from '@/lib/api/errors';
import { fetchToDataURL } from '@/lib/base64';
import { config } from '@/lib/config';
import Logger from '@/lib/logger';
import enabled from '@/lib/oauth/enabled';
import { generateOAuthState } from '@/lib/oauth/state';
import { googleAuthorizeURL, googleUser } from '@/lib/oauth/providers';
import { OAuthQuery, OAuthResponse } from '@/server/plugins/oauth';
import typedPlugin from '@/server/typedPlugin';

async function googleOauth({ code, host, state, session }: OAuthQuery, logger: Logger): Promise<OAuthResponse> {
  if (!config.features.oauthRegistration) throw new ApiError(3016);

  const { google: googleEnabled } = enabled(config);

  if (!googleEnabled) throw new ApiError(2003, 'Google OAuth is not configured.');

  if (!code) {
    throw new RedirectError(
      googleAuthorizeURL({
        clientId: config.oauth.google.clientId!,
        origin: `${config.core.returnHttpsUrls ? 'https' : 'http'}://${host}`,
        state: await generateOAuthState(session, state === 'link' ? 'link' : 'default'),
        redirectUri: config.oauth.google.redirectUri!,
      }),
    );
  }

  const body = new URLSearchParams({
    client_id: config.oauth.google.clientId!,
    client_secret: config.oauth.google.clientSecret!,
    grant_type: 'authorization_code',
    code,
    redirect_uri:
      config.oauth.google.redirectUri ??
      `${config.core.returnHttpsUrls ? 'https' : 'http'}://${host}/api/auth/oauth/google`,
    access_type: 'offline',
  });

  logger.debug('google oauth request', { body: body.toString() });

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    body,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });

  if (!res.ok) {
    const text = await res.text();
    logger.debug('google oauth failed with a non 200 status code', {
      status: res.status,
      text,
    });

    throw new ApiError(6004);
  }

  const json = await res.json();
  if (!json.access_token) throw new ApiError(6005);

  const userJson = await googleUser({
    accessToken: json.access_token,
  });
  if (!userJson) throw new ApiError(6007);

  logger.debug('user', { userinfo: userJson });

  return {
    access_token: json.access_token,
    refresh_token: json.refresh_token,
    username: userJson.given_name,
    user_id: userJson.id,
    avatar: await fetchToDataURL(userJson.picture),
  };
}

export const PATH = '/api/auth/oauth/google';
export default typedPlugin(
  async (server) => {
    server.get(PATH, async (req, res) => {
      return req.oauthHandle(res, 'GOOGLE', googleOauth);
    });
  },
  { name: PATH },
);
