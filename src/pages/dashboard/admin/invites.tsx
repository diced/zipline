import Layout from '@/components/Layout';
import DashboardInvites from '@/components/pages/invites';
import useLogin from '@/lib/hooks/useLogin';
import { withSafeConfig } from '@/lib/middleware/next/withSafeConfig';
import { LoadingOverlay } from '@mantine/core';
import { InferGetServerSidePropsType } from 'next';

export default function DashboardIndex({ config }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const { loading } = useLogin(true);
  if (loading) return <LoadingOverlay visible />;

  return (
    <Layout config={config}>
      <DashboardInvites />
    </Layout>
  );
}

export const getServerSideProps = withSafeConfig();
