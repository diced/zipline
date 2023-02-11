import { LoadingOverlay } from '@mantine/core';
import Layout from 'components/Layout';
import Folders from 'components/pages/Folders';
import useLogin from 'hooks/useLogin';
import Head from 'next/head';
export { getServerSideProps } from 'middleware/getServerSideProps';

export default function FilesPage(props) {
  const { loading } = useLogin();

  if (loading) return <LoadingOverlay visible={loading} />;

  const title = `${props.title} - Folders`;
  return (
    <>
      <Head>
        <title>{title}</title>
      </Head>

      <Layout props={props}>
        <Folders disableMediaPreview={props.disable_media_preview} exifEnabled={props.exif_enabled} />
      </Layout>
    </>
  );
}
