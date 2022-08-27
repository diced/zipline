import config from 'lib/config';
import { GetServerSideProps } from 'next';

export const getServerSideProps: GetServerSideProps = async context => {
  return {
    props: {
      title: config.website.title,
      external_links: JSON.stringify(config.website.external_links),
    },
  };
};