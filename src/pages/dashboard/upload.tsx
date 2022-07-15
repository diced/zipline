import React from 'react';
import useLogin from 'hooks/useLogin';
import Layout from 'components/Layout';
import Upload from 'components/pages/Upload';
import { LoadingOverlay } from '@mantine/core';
import { GetServerSideProps } from 'next';
import Head from 'next/head';

export default function UploadPage({ title }) {
  const { user, loading } = useLogin();

  if (loading) return <LoadingOverlay visible={loading} />;
  
  return (
    <>
      <Head>
        <title>{title} - Upload</title>
      </Head>
      <Layout
        user={user}
        title={title}
      >
        <Upload/>
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