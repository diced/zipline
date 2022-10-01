import React from 'react';
import useLogin from 'hooks/useLogin';
import Layout from 'components/Layout';
import UploadText from 'components/pages/UploadText';
import { LoadingOverlay } from '@mantine/core';
import Head from 'next/head';
export { getServerSideProps } from 'middleware/getServerSideProps';

export default function UploadTextPage(props) {
  const { loading } = useLogin();

  if (loading) return <LoadingOverlay visible={loading} />;
  
  return (
    <>
      <Head>
        <title>{props.title} - Upload Text</title>
      </Head>
      <Layout
        props={props}
      >
        <UploadText/>
      </Layout>
    </>
  );
}