import React from 'react';
import useLogin from 'hooks/useLogin';
import Layout from 'components/Layout';
import Files from 'components/pages/Files';
import { LoadingOverlay } from '@mantine/core';
import { GetServerSideProps } from 'next';
import Head from 'next/head';

export default function FilesPage({ title }) {
  const { user, loading } = useLogin();

  if (loading) return <LoadingOverlay visible={loading} />;
  
  return (
    <>
      <Head>
        <title>{title} - Files</title>
      </Head>

      <Layout
        user={user}
      >
        <Files />
      </Layout>
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async () => {
  return {
    props: {
      title: global.config.website.title,
    },
  };
};