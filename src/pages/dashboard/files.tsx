import Layout from '@/components/Layout';
import Files from '@/components/pages/files';
import useLogin from '@/lib/hooks/useLogin';
import { LoadingOverlay } from '@mantine/core';

export default function DashboardIndex() {
  const { loading } = useLogin();
  if (loading) return <LoadingOverlay visible />;

  return (
    <Layout>
      <Files />
    </Layout>
  );
}
