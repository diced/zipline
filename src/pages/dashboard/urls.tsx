import Layout from '@/components/Layout';
import DashboardURLs from '@/components/pages/urls';
import useLogin from '@/lib/hooks/useLogin';
import { withSafeConfig } from '@/lib/middleware/next/withSafeConfig';
import { LoadingOverlay } from '@mantine/core';
import { InferGetServerSidePropsType } from 'next';

export default function DashboardUrlsPage({
  config,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const { loading } = useLogin();
  if (loading) return <LoadingOverlay visible />;

  return (
    <Layout config={config}>
      <DashboardURLs />
    </Layout>
  );
}

export const getServerSideProps = withSafeConfig();
