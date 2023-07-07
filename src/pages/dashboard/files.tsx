import Layout from '@/components/Layout';
import DashbaordFiles from '@/components/pages/files';
import useLogin from '@/lib/hooks/useLogin';
import { withSafeConfig } from '@/lib/middleware/next/withSafeConfig';
import { LoadingOverlay } from '@mantine/core';
import { InferGetServerSidePropsType } from 'next';

export default function DashboardIndex({ config }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const { loading } = useLogin();
  if (loading) return <LoadingOverlay visible />;

  return (
    <Layout config={config}>
      <DashbaordFiles config={config} />
    </Layout>
  );
}

export const getServerSideProps = withSafeConfig();
