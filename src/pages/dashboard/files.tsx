import Layout from '@/components/Layout';
import DashboardFiles from '@/components/pages/files';
import useLogin from '@/lib/hooks/useLogin';
import { withSafeConfig } from '@/lib/middleware/next/withSafeConfig';
import { LoadingOverlay } from '@mantine/core';
import { InferGetServerSidePropsType } from 'next';

export default function DashboardFilesPage({
  config,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const { loading } = useLogin();
  if (loading) return <LoadingOverlay visible />;

  return (
    <Layout config={config}>
      <DashboardFiles />
    </Layout>
  );
}

export const getServerSideProps = withSafeConfig();
