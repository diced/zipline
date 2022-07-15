import React from 'react';
import useLogin from 'hooks/useLogin';
import Layout from 'components/Layout';
import Invites from 'components/pages/Invites';
import { LoadingOverlay } from '@mantine/core';
import Head from 'next/head';
import { GetServerSideProps } from 'next';

export default function InvitesPage({ title }) {
  const { user, loading } = useLogin();

  if (loading) return <LoadingOverlay visible={loading} />;
  
  return (
    <>
      <Head>
        <title>{title} - Invites</title>
      </Head>
      <Layout
        user={user}
        title={title}
      >
        <Invites />
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