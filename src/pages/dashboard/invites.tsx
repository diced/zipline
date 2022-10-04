import React, { useEffect } from 'react';
import useLogin from 'hooks/useLogin';
import Layout from 'components/Layout';
import Invites from 'components/pages/Invites';
import { LoadingOverlay } from '@mantine/core';
import Head from 'next/head';
import { useRouter } from 'next/router';
export { getServerSideProps } from 'middleware/getServerSideProps';

export default function InvitesPage(props) {
  const router = useRouter();
  if (!props.invites) {
    useEffect(() => {
      router.push('/dashboard');
    }, []);
    return null;
  };

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