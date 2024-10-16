import { config } from '@/lib/config';
import { combine } from '@/lib/middleware/combine';
import { method } from '@/lib/middleware/method';
import { OAuthQuery, OAuthResponse, withOAuth } from '@/lib/oauth/withOAuth';
import enabled from '@/lib/oauth/enabled';
import { discordAuth } from '@/lib/oauth/providerUtil';
import { fetchToDataURL } from '@/lib/base64';
import Logger from '@/lib/logger';

async function handler({ code, state, host }: OAuthQuery, logger: Logger): Promise<OAuthResponse> {
  if (!config.features.oauthRegistration)
    return {
      error: 'OAuth registration is disabled.',
      error_code: 403,
    };

  const { discord: discordEnabled } = enabled(config);

  if (!discordEnabled)
    return {
      error: 'Discord OAuth is not configured.',
      error_code: 401,
    };

  if (!code)
    return {
      redirect: discordAuth.url(
        config.oauth.discord.clientId!,
        `${config.core.returnHttpsUrls ? 'https' : 'http'}://${host}`,
        state,
        config.oauth.discord.redirectUri ?? undefined,
      ),
    };

  const body = new URLSearchParams({
    client_id: config.oauth.discord.clientId!,
    client_secret: config.oauth.discord.clientSecret!,
    grant_type: 'authorization_code',
    code,
    redirect_uri: `${config.core.returnHttpsUrls ? 'https' : 'http'}://${host}/api/auth/oauth/discord`,
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

  if (!res.ok)
    return {
      error: 'Failed to fetch access token',
    };

  const json = await res.json();

  if (!json.access_token) return { error: 'No access token in response' };
  if (!json.refresh_token) return { error: 'No refresh token in response' };

  const userJson = await discordAuth.user(json.access_token);
  if (!userJson) return { error: 'Failed to fetch user' };

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

export default combine([method(['GET'])], withOAuth('DISCORD', handler));
