import Layout from '@/components/Layout';
import DashboardFolders from '@/components/pages/folders';
import useLogin from '@/lib/hooks/useLogin';
import { withSafeConfig } from '@/lib/middleware/next/withSafeConfig';
import { LoadingOverlay } from '@mantine/core';
import { InferGetServerSidePropsType } from 'next';

export default function DashboardFoldersPage({
  config,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const { loading } = useLogin();
  if (loading) return <LoadingOverlay visible />;

  return (
    <Layout config={config}>
      <DashboardFolders />
    </Layout>
  );
}

export const getServerSideProps = withSafeConfig();
