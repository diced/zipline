import React from 'react';
import useLogin from 'hooks/useLogin';
import Layout from 'components/Layout';
import Users from 'components/pages/Users';
import { LoadingOverlay } from '@mantine/core';
import { GetServerSideProps } from 'next';
import Head from 'next/head';

export default function UsersPage({ title }) {
  const { user, loading } = useLogin();

  if (loading) return <LoadingOverlay visible={loading} />;
  
  return (
    <>
      <Head>
        <title>{title} - Users</title>
      </Head>
      <Layout
        user={user}
      >
        <Users />
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