import React from 'react';
import useLogin from 'hooks/useLogin';
import Layout from 'components/Layout';
import Stats from 'components/pages/Stats';

export default function StatsPage() {
  const { user, loading } = useLogin();
  if (loading) return null;
  
  return (
    <Layout
      user={user}
    >
      <Stats />
    </Layout>
  );
}

StatsPage.title = 'Zipline - Stats';