import React from 'react';
import useLogin from 'hooks/useLogin';
import Layout from 'components/Layout';
import Files from 'components/pages/Files';
import { LoadingOverlay } from '@mantine/core';

export default function FilesPage() {
  const { user, loading } = useLogin();

  if (loading) return <LoadingOverlay visible={loading} />;
  
  return (
    <Layout
      user={user}
    >
      <Files />
    </Layout>
  );
}

FilesPage.title = 'Zipline - Files';