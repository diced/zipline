import React from 'react';
import useLogin from 'hooks/useLogin';
import Layout from 'components/Layout';
import Stats from 'components/pages/Stats';
import { LoadingOverlay } from '@mantine/core';

export default function StatsPage() {
  const { user, loading } = useLogin();
  
  if (loading) return <LoadingOverlay visible={loading} />;
  
  return (
    <Layout
      user={user}
    >
      <Stats />
    </Layout>
  );
}

StatsPage.title = 'Zipline - Stats';