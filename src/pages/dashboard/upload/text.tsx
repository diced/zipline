import { LoadingOverlay } from '@mantine/core';
import Layout from 'components/Layout';
import Text from 'components/pages/Upload/Text';
import useLogin from 'hooks/useLogin';
import Head from 'next/head';
export { getServerSideProps } from 'middleware/getServerSideProps';

export default function UploadTextPage(props) {
  const { loading } = useLogin();

  if (loading) return <LoadingOverlay visible={loading} />;

  const title = `${props.title} - Upload to Pastebin`;
  return (
    <>
      <Head>
        <title>{title}</title>
      </Head>
      <Layout props={props}>
        <Text />
      </Layout>
    </>
  );
}
