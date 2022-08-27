import React from 'react';
import useLogin from 'hooks/useLogin';
import Layout from 'components/Layout';
import Files from 'components/pages/Files';
import { LoadingOverlay } from '@mantine/core';
import Head from 'next/head';
export { getServerSideProps } from 'middleware/getServerSideProps';

export default function FilesPage(props) {
  const { user, loading } = useLogin();

  if (loading) return <LoadingOverlay visible={loading} />;
  
  return (
    <>
      <Head>
        <title>{props.title} - Files</title>
      </Head>

      <Layout
        user={user}
        props={props}
      >
        <Files />
      </Layout>
    </>
  );
}