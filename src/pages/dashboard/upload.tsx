import React from 'react';
import useLogin from 'hooks/useLogin';
import Layout from 'components/Layout';
import Upload from 'components/pages/Upload';

export default function UploadPage({ route }) {
  const { user, loading } = useLogin();

  if (loading) return null;
  
  return (
    <Layout
      user={user}
    >
      <Upload/>
    </Layout>
  );
}

UploadPage.title = 'Zipline - Upload';