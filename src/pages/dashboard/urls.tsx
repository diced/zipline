import React from 'react';
import useLogin from 'hooks/useLogin';
import Layout from 'components/Layout';
import Urls from 'components/pages/Urls';
import { LoadingOverlay } from '@mantine/core';

export default function UrlsPage() {
  const { user, loading } = useLogin();

  if (loading) return <LoadingOverlay visible={loading} />;
  
  return (
    <Layout
      user={user}
    >
      <Urls />
    </Layout>
  );
}

UrlsPage.title = 'Zipline - URLs';