import React from 'react';
import useLogin from 'hooks/useLogin';
import Layout from 'components/Layout';
import Stats from 'components/pages/Stats';
import { LoadingOverlay } from '@mantine/core';
import { GetServerSideProps } from 'next';
import Head from 'next/head';

export default function StatsPage({ title }) {
  const { user, loading } = useLogin();
  
  if (loading) return <LoadingOverlay visible={loading} />;
  
  return (
    <>
      <Head>
        <title>{title} - Stats</title>
      </Head>
      <Layout
        user={user}
      >
        <Stats />
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