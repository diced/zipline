import React from 'react';
import useLogin from 'hooks/useLogin';
import Layout from 'components/Layout';
import Files from 'components/pages/Files';

export default function ImagesPage() {
  const { user, loading } = useLogin();

  if (loading) return null;
  
  return (
    <Layout
      user={user}
      loading={loading}
      noPaper={false}
    >
      <Files />
    </Layout>
  );
}

ImagesPage.title = 'Zipline - Gallery';