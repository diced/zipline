export const github_auth = {
  oauth_url: (clientId: string) =>
    `https://github.com/login/oauth/authorize?client_id=${clientId}&scope=user`,
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
  oauth_url: (clientId: string, origin: string) =>
    `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(
      `${origin}/api/auth/oauth/discord`
    )}&response_type=code&scope=identify`,
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
