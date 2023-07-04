import Layout from '@/components/Layout';
import UploadFile from '@/components/pages/upload/File';
import useLogin from '@/lib/hooks/useLogin';
import { LoadingOverlay } from '@mantine/core';

export default function DashboardUploadFile() {
  const { loading } = useLogin();

  if (loading) return <LoadingOverlay visible />;

  return (
    <Layout>
      <UploadFile />
    </Layout>
  );
}
