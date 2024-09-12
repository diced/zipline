import Layout from '@/components/Layout';
import DashboardServerSettings from '@/components/pages/serverSettings';
import useLogin from '@/lib/hooks/useLogin';
import { withSafeConfig } from '@/lib/middleware/next/withSafeConfig';
import { isAdministrator } from '@/lib/role';
import { LoadingOverlay } from '@mantine/core';
import { InferGetServerSidePropsType } from 'next';

export default function DashboardIndex({ config }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const { loading, user } = useLogin(true);
  if (loading) return <LoadingOverlay visible />;

  if (!isAdministrator(user?.role)) return null;

  return (
    <Layout config={config}>
      <DashboardServerSettings />
    </Layout>
  );
}

export const getServerSideProps = withSafeConfig();
