import Layout from '@/components/Layout';
import UploadFile from '@/components/pages/upload/File';
import useLogin from '@/lib/hooks/useLogin';
import { withSafeConfig } from '@/lib/middleware/next/withSafeConfig';
import { LoadingOverlay } from '@mantine/core';
import { InferGetServerSidePropsType } from 'next';

export default function DashboardUploadFile({ config }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const { loading } = useLogin();

  if (loading) return <LoadingOverlay visible />;

  return (
    <Layout config={config}>
      <UploadFile />
    </Layout>
  );
}

export const getServerSideProps = withSafeConfig();