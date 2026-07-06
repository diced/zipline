import { ApiError, RedirectError } from '@/lib/api/errors';
import { fetchToDataURL } from '@/lib/base64';
import { config } from '@/lib/config';
import Logger from '@/lib/logger';
import enabled from '@/lib/oauth/enabled';
import { generateOAuthState } from '@/lib/oauth/state';
import { discordAuthorizeURL, discordUser } from '@/lib/oauth/providers';
import { OAuthQuery, OAuthResponse } from '@/server/plugins/oauth';
import typedPlugin from '@/server/typedPlugin';

async function discordOauth(
  { code, host, state, session }: OAuthQuery,
  logger: Logger,
): Promise<OAuthResponse> {
  if (!config.features.oauthRegistration) throw new ApiError(3016);

  const { discord: discordEnabled } = enabled(config);

  if (!discordEnabled) throw new ApiError(2003, 'Discord OAuth is not configured.');

  if (!code) {
    throw new RedirectError(
      discordAuthorizeURL({
        clientId: config.oauth.discord.clientId!,
        origin: `${config.core.returnHttpsUrls ? 'https' : 'http'}://${host}`,
        state: await generateOAuthState(session, state === 'link' ? 'link' : 'default'),
        redirectUri: config.oauth.discord.redirectUri!,
      }),
    );
  }

  const body = new URLSearchParams({
    client_id: config.oauth.discord.clientId!,
    client_secret: config.oauth.discord.clientSecret!,
    grant_type: 'authorization_code',
    code,
    redirect_uri:
      config.oauth.discord.redirectUri ??
      `${config.core.returnHttpsUrls ? 'https' : 'http'}://${host}/api/auth/oauth/discord`,
    scope: 'identify',
  });

  logger.debug('discord oauth request', {
    body: body.toString(),
  });

  const res = await fetch('https://discord.com/api/oauth2/token', {
    method: 'POST',
    body,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });

  if (!res.ok) {
    const text = await res.text();
    logger.debug('discord oauth failed with a non 200 status code', {
      status: res.status,
      text,
    });

    throw new ApiError(6004);
  }

  const json = await res.json();

  if (!json.access_token) throw new ApiError(6005);
  if (!json.refresh_token) throw new ApiError(6006);

  const userJson = await discordUser({
    accessToken: json.access_token,
  });
  if (!userJson) throw new ApiError(6007);

  logger.debug('user', { '@me': userJson });

  const allowedIds = config.oauth.discord.allowedIds;
  const deniedIds = config.oauth.discord.deniedIds;
  if (deniedIds && deniedIds.length > 0 && deniedIds.includes(userJson.id)) throw new ApiError(3017);

  if (allowedIds && allowedIds.length > 0 && !allowedIds.includes(userJson.id)) throw new ApiError(3017);

  const avatar = userJson.avatar
    ? `https://cdn.discordapp.com/avatars/${userJson.id}/${userJson.avatar}.png`
    : `https://cdn.discordapp.com/embed/avatars/${userJson.discriminator % 5}.png`;

  return {
    access_token: json.access_token,
    refresh_token: json.refresh_token,
    username: userJson.username,
    user_id: userJson.id,
    avatar: await fetchToDataURL(avatar),
  };
}

export const PATH = '/api/auth/oauth/discord';
export default typedPlugin(
  async (server) => {
    server.get(PATH, async (req, res) => {
      return req.oauthHandle(res, 'DISCORD', discordOauth);
    });
  },
  { name: PATH },
);
