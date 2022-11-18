import { LoadingOverlay } from '@mantine/core';
import Layout from 'components/Layout';
import Manage from 'components/pages/Manage';
import useLogin from 'hooks/useLogin';
import type { ServerSideProps } from 'middleware/getServerSideProps';
import Head from 'next/head';
export { getServerSideProps } from 'middleware/getServerSideProps';

export default function ManagePage(props: ServerSideProps) {
  const { loading } = useLogin();

  if (loading) return <LoadingOverlay visible={loading} />;

  const title = `${props.title} - Manage User`;
  return (
    <>
      <Head>
        <title>{title}</title>
      </Head>
      <Layout props={props}>
        <Manage
          oauth_providers={props.oauth_providers}
          oauth_registration={props.oauth_registration}
          totp_enabled={props.totp_enabled}
        />
      </Layout>
    </>
  );
}
