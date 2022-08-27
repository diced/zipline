import React from 'react';
import useLogin from 'hooks/useLogin';
import Layout from 'components/Layout';
import Dashboard from 'components/pages/Dashboard';
import { LoadingOverlay } from '@mantine/core';
import Head from 'next/head';
export { getServerSideProps } from 'middleware/getServerSideProps';

export default function DashboardPage(props) {
  const { user, loading } = useLogin();

  if (loading) return <LoadingOverlay visible={loading} />;

  return (
    <>
      <Head>
        <title>{props.title}</title>
      </Head>
      <Layout
        user={user}
        props={props}
      >
        <Dashboard />
      </Layout>
    </>
  );
}