import { LoadingOverlay } from '@mantine/core';
import Layout from 'components/Layout';
import Invites from 'components/pages/Invites';
import useLogin from 'hooks/useLogin';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
export { getServerSideProps } from 'middleware/getServerSideProps';

export default function InvitesPage(props) {
  const router = useRouter();
  if (!props.invites) {
    useEffect(() => {
      router.push('/dashboard');
    }, []);
    return null;
  }

  const { loading } = useLogin();

  if (loading) return <LoadingOverlay visible={loading} />;

  const title = `${props.title} - Invites`;
  return (
    <>
      <Head>
        <title>{title}</title>
      </Head>
      <Layout props={props}>
        <Invites />
      </Layout>
    </>
  );
}
