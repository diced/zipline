import React from 'react';
import { GetStaticProps } from 'next';
import useLogin from 'hooks/useLogin';
import Layout from 'components/Layout';
import Upload from 'components/pages/Upload';
import config from 'lib/config';

export default function UploadPage({ route }) {
  const { user, loading } = useLogin();

  if (loading) return null;
  
  return (
    <Layout
      user={user}
      loading={loading}
      noPaper={false}
    >
      <Upload route={route}/>
    </Layout>
  );
}

export const getStaticProps: GetStaticProps = async (context) => {
  return {
    props: {
      route: config.uploader.route,
    },
  };
};

UploadPage.title = 'Zipline - Upload';