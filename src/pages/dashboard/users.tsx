import React from 'react';
import useLogin from 'hooks/useLogin';
import Layout from 'components/Layout';
import Users from 'components/pages/Users';

export default function UsersPage() {
  const { user, loading } = useLogin();

  if (loading) return null;
  
  return (
    <Layout
      user={user}
      loading={loading}
      noPaper={false}
    >
      <Users />
    </Layout>
  );
}

UsersPage.title = 'Zipline - User';