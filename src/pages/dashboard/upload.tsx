import React from 'react';
import useLogin from 'hooks/useLogin';
import Layout from 'components/Layout';
import Upload from 'components/pages/Upload';
import { LoadingOverlay } from '@mantine/core';

export default function UploadPage() {
  const { user, loading } = useLogin();

  if (loading) return <LoadingOverlay visible={loading} />;
  
  return (
    <Layout
      user={user}
    >
      <Upload/>
    </Layout>
  );
}

UploadPage.title = 'Zipline - Upload';