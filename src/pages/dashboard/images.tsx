import React from 'react';
import useLogin from 'hooks/useLogin';
import Layout from 'components/Layout';
import Images from 'components/pages/Images';

export default function ImagesPage() {
  const { user, loading } = useLogin();

  if (loading) return null;
  
  return (
    <Layout
      user={user}
      loading={loading}
      noPaper={false}
    >
      <Images />
    </Layout>
  );
}

ImagesPage.title = 'Zipline - Gallery';