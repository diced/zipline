import React from 'react';
import useLogin from 'hooks/useLogin';
import Layout from 'components/Layout';
import Urls from 'components/pages/Urls';
import { LoadingOverlay } from '@mantine/core';
import Head from 'next/head';
export { getServerSideProps } from 'middleware/getServerSideProps';

export default function UrlsPage(props) {
  const { loading } = useLogin();

  if (loading) return <LoadingOverlay visible={loading} />;

  return (
    <>
      <Head>
        <title>{props.title} - URLs</title>
      </Head>
      <Layout
        props={props}
      >
        <Urls />
      </Layout>
    </>
  );
}