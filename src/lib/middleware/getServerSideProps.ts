import config from 'lib/config';
import { GetServerSideProps } from 'next';

export const getServerSideProps: GetServerSideProps = async () => {
  return {
    props: {
      title: config.website.title,
      external_links: JSON.stringify(config.website.external_links),
      disable_media_preview: config.website.disable_media_preview,
      invites: config.features.invites,
    },
  };
};