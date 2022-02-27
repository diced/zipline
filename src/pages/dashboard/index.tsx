import React from 'react';
import useLogin from 'hooks/useLogin';
import Layout from 'components/Layout';
import Dashboard from 'components/pages/Dashboard';

export default function DashboardPage() {
  const { user, loading } = useLogin();
  if (loading) return null;
  
  return (
    <Layout
      user={user}
    >
      <Dashboard />
    </Layout>
  );
}

DashboardPage.title = 'Zipline';