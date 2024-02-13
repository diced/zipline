import Layout from '@/components/Layout';
import DashboardMetrics from '@/components/pages/metrics';
import useLogin from '@/lib/hooks/useLogin';
import { withSafeConfig } from '@/lib/middleware/next/withSafeConfig';
import { isAdministrator } from '@/lib/role';
import { LoadingOverlay } from '@mantine/core';
import { InferGetServerSidePropsType } from 'next';
import { useRouter } from 'next/router';

export default function DashboardIndex({ config }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const router = useRouter();
  const { loading, user } = useLogin();
  if (loading) return <LoadingOverlay visible />;

  if (
    config.features.metrics.enabled === false ||
    (config.features.metrics.adminOnly ? !isAdministrator(user?.role) : false)
  )
    return router.push('/dashboard');

  return (
    <Layout config={config}>
      <DashboardMetrics />
    </Layout>
  );
}

export const getServerSideProps = withSafeConfig();
