import React from 'react';
import useLogin from 'hooks/useLogin';
import Layout from 'components/Layout';
import Urls from 'components/pages/Urls';

export default function UrlsPage() {
  const { user, loading } = useLogin();

  if (loading) return null;
  
  return (
    <Layout
      user={user}
    >
      <Urls />
    </Layout>
  );
}

UrlsPage.title = 'Zipline - URLs';