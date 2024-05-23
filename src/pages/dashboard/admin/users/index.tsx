import Layout from '@/components/Layout';
import DashboardUsers from '@/components/pages/users';
import useLogin from '@/lib/hooks/useLogin';
import { withSafeConfig } from '@/lib/middleware/next/withSafeConfig';
import { LoadingOverlay } from '@mantine/core';
import { InferGetServerSidePropsType } from 'next';

export default function DashboardIndex({ config }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const { loading } = useLogin(true);
  if (loading) return <LoadingOverlay visible />;

  return (
    <Layout config={config}>
      <DashboardUsers />
    </Layout>
  );
}

export const getServerSideProps = withSafeConfig();
