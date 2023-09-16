import Layout from '@/components/Layout';
import DashboardMetrics from '@/components/pages/metrics';
import useLogin from '@/lib/hooks/useLogin';
import { withSafeConfig } from '@/lib/middleware/next/withSafeConfig';
import { LoadingOverlay } from '@mantine/core';
import { InferGetServerSidePropsType } from 'next';
import { useRouter } from 'next/router';

export default function DashboardIndex({ config }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const router = useRouter();
  const { loading } = useLogin();
  if (loading) return <LoadingOverlay visible />;

  if (config.features.metrics === false) return router.push('/dashboard');

  return (
    <Layout config={config}>
      <DashboardMetrics />
    </Layout>
  );
}

export const getServerSideProps = withSafeConfig();
