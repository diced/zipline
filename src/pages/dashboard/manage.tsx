import React from 'react';
import useLogin from 'hooks/useLogin';
import Layout from 'components/Layout';
import Manage from 'components/pages/Manage';

export default function ManagePage() {
  const { user, loading } = useLogin();

  if (loading) return null;
  
  return (
    <Layout
      user={user}
    >
      <Manage />
    </Layout>
  );
}

ManagePage.title = 'Zipline - Manage';