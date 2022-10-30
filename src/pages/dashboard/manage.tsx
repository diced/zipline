import React from 'react';
import useLogin from 'hooks/useLogin';
import Layout from 'components/Layout';
import Manage from 'components/pages/Manage';
import { LoadingOverlay } from '@mantine/core';
import Head from 'next/head';
export { getServerSideProps } from 'middleware/getServerSideProps';

export default function ManagePage(props) {
  const { loading } = useLogin();

  if (loading) return <LoadingOverlay visible={loading} />;

  const title = `${props.title} - Manage User`;
  return (
    <>
      <Head>
        <title>{title}</title>
      </Head>
      <Layout props={props}>
        <Manage oauth_providers={props.oauth_providers} oauth_registration={props.oauth_registration} />
      </Layout>
    </>
  );
}
