import React from 'react';
import useLogin from 'hooks/useLogin';
import Layout from 'components/Layout';
import UploadText from 'components/pages/UploadText';
import { LoadingOverlay } from '@mantine/core';
import { GetServerSideProps } from 'next';
import Head from 'next/head';

export default function UploadTextPage({ title }) {
  const { user, loading } = useLogin();

  if (loading) return <LoadingOverlay visible={loading} />;
  
  return (
    <>
      <Head>
        <title>{title} - Upload Text</title>
      </Head>
      <Layout
        user={user}
      >
        <UploadText/>
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