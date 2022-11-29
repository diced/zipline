import { LoadingOverlay } from '@mantine/core';
import Layout from 'components/Layout';
import File from 'components/pages/Upload/File';
import useLogin from 'hooks/useLogin';
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
        <File chunks={{ chunks_size: props.chunks_size, max_size: props.max_size }} />
      </Layout>
    </>
  );
}
