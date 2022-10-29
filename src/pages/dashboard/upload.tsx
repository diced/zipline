import React from 'react';
import useLogin from 'hooks/useLogin';
import Layout from 'components/Layout';
import Upload from 'components/pages/Upload';
import { LoadingOverlay } from '@mantine/core';
import Head from 'next/head';
export { getServerSideProps } from 'middleware/getServerSideProps';

export default function UploadPage(props) {
  const { loading } = useLogin();

  if (loading) return <LoadingOverlay visible={loading} />;

  const title = `${props.title} - Upload`;
  return (
    <>
      <Head>
        <title>{title}</title>
      </Head>
      <Layout props={props}>
        <Upload chunks={{ chunks_size: props.chunks_size, max_size: props.max_size }} />
      </Layout>
    </>
  );
}
