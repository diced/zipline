import { LoadingOverlay } from '@mantine/core';
import Layout from 'components/Layout';
import Urls from 'components/pages/Urls';
import useLogin from 'hooks/useLogin';
import Head from 'next/head';
export { getServerSideProps } from 'middleware/getServerSideProps';

export default function UrlsPage(props) {
  const { loading } = useLogin();

  if (loading) return <LoadingOverlay visible={loading} />;

  const title = `${props.title} - URLs`;
  return (
    <>
      <Head>
        <title>{title}</title>
      </Head>
      <Layout props={props}>
        <Urls />
      </Layout>
    </>
  );
}
