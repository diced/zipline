import React from 'react';
import useLogin from 'hooks/useLogin';
import Layout from 'components/Layout';
import Invites from 'components/pages/Invites';
import { LoadingOverlay } from '@mantine/core';

export default function InvitesPage() {
  const { user, loading } = useLogin();

  if (loading) return <LoadingOverlay visible={loading} />;
  
  return (
    <Layout
      user={user}
    >
      <Invites />
    </Layout>
  );
}

InvitesPage.title = 'Zipline - Invites';