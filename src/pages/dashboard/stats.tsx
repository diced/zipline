import { LoadingOverlay } from '@mantine/core';
import Layout from 'components/Layout';
import Stats from 'components/pages/Stats';
import useLogin from 'hooks/useLogin';
import Head from 'next/head';
export { getServerSideProps } from 'middleware/getServerSideProps';

export default function StatsPage(props) {
  const { loading } = useLogin();

  if (loading) return <LoadingOverlay visible={loading} />;

  const title = `${props.title} - Statistics`;
  return (
    <>
      <Head>
        <title>{title}</title>
      </Head>
      <Layout props={props}>
        <Stats />
      </Layout>
    </>
  );
}
