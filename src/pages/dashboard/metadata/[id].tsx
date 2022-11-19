import { LoadingOverlay } from '@mantine/core';
import Layout from 'components/Layout';
import MetadataView from 'components/pages/MetadataView';
import useLogin from 'hooks/useLogin';
import Head from 'next/head';
export { getServerSideProps } from 'middleware/getServerSideProps';

export default function MetadataPage(props) {
  const { loading } = useLogin();

  if (loading) return <LoadingOverlay visible={loading} />;

  return (
    <>
      <Head>
        <title>{props.title}</title>
      </Head>
      <Layout props={props}>
        <MetadataView fileId={props.fileId} />
      </Layout>
    </>
  );
}
