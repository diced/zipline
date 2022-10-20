import config from 'lib/config';
import { discord_auth, github_auth } from 'lib/oauth';
import { notNull } from 'lib/util';
import { GetServerSideProps } from 'next';

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  // this entire thing will also probably change before the stable release
  const ghEnabled = notNull(config.oauth?.github_client_id, config.oauth?.github_client_secret);
  const discEnabled = notNull(config.oauth?.discord_client_id, config.oauth?.discord_client_secret);

  const oauth_providers = [];

  if (ghEnabled)
    oauth_providers.push({
      name: 'GitHub',
      url: '/api/auth/oauth/github',
    });
  if (discEnabled)
    oauth_providers.push({
      name: 'Discord',
      url: '/api/auth/oauth/discord',
    });

  return {
    props: {
      title: config.website.title,
      external_links: JSON.stringify(config.website.external_links),
      disable_media_preview: config.website.disable_media_preview,
      invites: config.features.invites,
      oauth_registration: config.features.oauth_registration,
      oauth_providers: JSON.stringify(oauth_providers),
    },
  };
};
