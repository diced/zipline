import React from 'react';
import useLogin from 'hooks/useLogin';
import Layout from 'components/Layout';
import Users from 'components/pages/Users';
import { LoadingOverlay } from '@mantine/core';

export default function UsersPage() {
  const { user, loading } = useLogin();

  if (loading) return <LoadingOverlay visible={loading} />;
  
  return (
    <Layout
      user={user}
    >
      <Users />
    </Layout>
  );
}

UsersPage.title = 'Zipline - Users';