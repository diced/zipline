import config from 'lib/config';
import { notNull } from 'lib/util';
import { GetServerSideProps } from 'next';

export type OauthProvider = {
  name: string;
  url: string;
  link_url: string;
};

export type ServerSideProps = {
  title: string;
  external_links: string;
  disable_media_preview: boolean;
  invites: boolean;
  user_registration: boolean;
  oauth_registration: boolean;
  oauth_providers: string;
  chunks_size: number;
  max_size: number;
  totp_enabled: boolean;
};

export const getServerSideProps: GetServerSideProps<ServerSideProps> = async () => {
  const ghEnabled = notNull(config.oauth?.github_client_id, config.oauth?.github_client_secret);
  const discEnabled = notNull(config.oauth?.discord_client_id, config.oauth?.discord_client_secret);
  const googleEnabled = notNull(config.oauth?.google_client_id, config.oauth?.google_client_secret);

  const oauth_providers: OauthProvider[] = [];

  if (ghEnabled)
    oauth_providers.push({
      name: 'GitHub',
      url: '/api/auth/oauth/github',
      link_url: '/api/auth/oauth/github?state=link',
    });
  if (discEnabled)
    oauth_providers.push({
      name: 'Discord',
      url: '/api/auth/oauth/discord',
      link_url: '/api/auth/oauth/discord?state=link',
    });

  if (googleEnabled)
    oauth_providers.push({
      name: 'Google',
      url: '/api/auth/oauth/google',
      link_url: '/api/auth/oauth/google?state=link',
    });

  return {
    props: {
      title: config.website.title,
      external_links: JSON.stringify(config.website.external_links),
      disable_media_preview: config.website.disable_media_preview,
      invites: config.features.invites,
      user_registration: config.features.user_registration,
      oauth_registration: config.features.oauth_registration,
      oauth_providers: JSON.stringify(oauth_providers),
      chunks_size: config.chunks.chunks_size,
      max_size: config.chunks.max_size,
      totp_enabled: config.mfa.totp_enabled,
    },
  };
};
