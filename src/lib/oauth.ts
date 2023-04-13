export const github_auth = {
  oauth_url: (clientId: string, state?: string) =>
    `https://github.com/login/oauth/authorize?client_id=${clientId}&scope=read:user${
      state ? `&state=${state}` : ''
    }`,
  oauth_user: async (access_token: string) => {
    const res = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });
    if (!res.ok) return null;

    return res.json();
  },
};

export const discord_auth = {
  oauth_url: (clientId: string, origin: string, state?: string) =>
    `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(
      `${origin}/api/auth/oauth/discord`
    )}&response_type=code&scope=identify${state ? `&state=${state}` : ''}`,
  oauth_user: async (access_token: string) => {
    const res = await fetch('https://discord.com/api/users/@me', {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });
    if (!res.ok) return null;

    return res.json();
  },
};

export const google_auth = {
  oauth_url: (clientId: string, origin: string, state?: string) =>
    `https://accounts.google.com/o/oauth2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(
      `${origin}/api/auth/oauth/google`
    )}&response_type=code&access_type=offline&scope=https://www.googleapis.com/auth/userinfo.profile${
      state ? `&state=${state}` : ''
    }`,
  oauth_user: async (access_token: string) => {
    const res = await fetch(
      `https://people.googleapis.com/v1/people/me?access_token=${access_token}&personFields=names,photos`
    );
    if (!res.ok) return null;

    return res.json();
  },
};

export const authentik_auth = {
  oauth_url: (clientId: string, origin: string, authorize_url: string, state?: string) =>
    `${authorize_url}?client_id=${clientId}&redirect_uri=${encodeURIComponent(
      `${origin}/api/auth/oauth/authentik`
    )}&response_type=code&scope=openid+email+profile${state ? `&state=${state}` : ''}`,
  oauth_user: async (access_token: string, user_info_url: string) => {
    const res = await fetch(user_info_url, {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });
    if (!res.ok) return null;

    return res.json();
  },
};
