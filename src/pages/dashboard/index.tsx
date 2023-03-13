import { LoadingOverlay } from '@mantine/core';
import Layout from 'components/Layout';
import Dashboard from 'components/pages/Dashboard';
import useLogin from 'hooks/useLogin';
import Head from 'next/head';
export { getServerSideProps } from 'middleware/getServerSideProps';

export default function DashboardPage(props) {
  const { loading } = useLogin();

  if (loading) return <LoadingOverlay visible={loading} />;

  return (
    <>
      <Head>
        <title>{props.title}</title>
      </Head>
      <Layout props={props}>
        <Dashboard
          disableMediaPreview={props.disable_media_preview}
          exifEnabled={props.exif_enabled}
          compress={props.compress}
        />
      </Layout>
    </>
  );
}
