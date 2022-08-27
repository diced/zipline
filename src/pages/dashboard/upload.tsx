import React from 'react';
import useLogin from 'hooks/useLogin';
import Layout from 'components/Layout';
import Upload from 'components/pages/Upload';
import { LoadingOverlay } from '@mantine/core';
import Head from 'next/head';
export { getServerSideProps } from 'middleware/getServerSideProps';

export default function UploadPage(props) {
  const { user, loading } = useLogin();

  if (loading) return <LoadingOverlay visible={loading} />;

  return (
    <>
      <Head>
        <title>{props.title} - Upload</title>
      </Head>
      <Layout
        user={user}
        props={props}
      >
        <Upload />
      </Layout>
    </>
  );
}