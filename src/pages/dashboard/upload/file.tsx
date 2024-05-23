import Layout from '@/components/Layout';
import UploadFile from '@/components/pages/upload/File';
import useLogin from '@/lib/hooks/useLogin';
import { withSafeConfig } from '@/lib/middleware/next/withSafeConfig';
import { useUploadOptionsStore } from '@/lib/store/uploadOptions';
import { LoadingOverlay } from '@mantine/core';
import { InferGetServerSidePropsType } from 'next';
import { useEffect } from 'react';

export default function DashboardUploadFile({
  config,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const { loading } = useLogin();

  const clearEphemeral = useUploadOptionsStore((state) => state.clearEphemeral);

  useEffect(() => {
    window.addEventListener('beforeunload', clearEphemeral);

    return () => {
      window.removeEventListener('beforeunload', clearEphemeral);
    };
  }, []);

  if (loading) return <LoadingOverlay visible />;

  return (
    <Layout config={config}>
      <UploadFile />
    </Layout>
  );
}

export const getServerSideProps = withSafeConfig();
