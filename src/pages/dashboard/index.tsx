import React from 'react';
import useLogin from 'hooks/useLogin';
import Layout from 'components/Layout';
import Dashboard from 'components/pages/Dashboard';
import { LoadingOverlay } from '@mantine/core';
import { GetServerSideProps } from 'next';
import Head from 'next/head';

export default function DashboardPage({ title, meta }) {
  const { user, loading } = useLogin();

  if (loading) return <LoadingOverlay visible={loading} />;

  return (
    <>
      <Head>
        <title>{title}</title>
      </Head>
      <Layout
        user={user}
      >
        <Dashboard />
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