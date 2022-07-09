import React from 'react';
import useLogin from 'hooks/useLogin';
import Layout from 'components/Layout';
import UploadText from 'components/pages/UploadText';
import { LoadingOverlay } from '@mantine/core';

export default function UploadTextPage() {
  const { user, loading } = useLogin();

  if (loading) return <LoadingOverlay visible={loading} />;
  
  return (
    <Layout
      user={user}
    >
      <UploadText/>
    </Layout>
  );
}

UploadTextPage.title = 'Zipline - Upload Text';