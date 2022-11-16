import { LoadingOverlay } from '@mantine/core';
import Layout from 'components/Layout';
import Files from 'components/pages/Files';
import useLogin from 'hooks/useLogin';
import Head from 'next/head';
export { getServerSideProps } from 'middleware/getServerSideProps';

export default function FilesPage(props) {
  const { loading } = useLogin();

  if (loading) return <LoadingOverlay visible={loading} />;

  const title = `${props.title} - Files`;
  return (
    <>
      <Head>
        <title>{title}</title>
      </Head>

      <Layout props={props}>
        <Files disableMediaPreview={props.disable_media_preview} />
      </Layout>
    </>
  );
}
