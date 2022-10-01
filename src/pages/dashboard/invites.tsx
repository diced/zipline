import React from 'react';
import useLogin from 'hooks/useLogin';
import Layout from 'components/Layout';
import Invites from 'components/pages/Invites';
import { LoadingOverlay } from '@mantine/core';
import Head from 'next/head';
export { getServerSideProps } from 'middleware/getServerSideProps';

export default function InvitesPage(props) {
  const { loading } = useLogin();

  if (loading) return <LoadingOverlay visible={loading} />;
  
  return (
    <>
      <Head>
        <title>{props.title} - Invites</title>
      </Head>
      <Layout
        props={props}
      >
        <Invites />
      </Layout>
    </>
  );
}