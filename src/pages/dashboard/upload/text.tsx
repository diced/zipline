import Layout from '@/components/Layout';
import UploadText from '@/components/pages/upload/Text/index';
import useLogin from '@/lib/hooks/useLogin';
import { withSafeConfig } from '@/lib/middleware/next/withSafeConfig';
import { useUploadOptionsStore } from '@/lib/store/uploadOptions';
import { LoadingOverlay } from '@mantine/core';
import { readFile } from 'fs/promises';
import { InferGetServerSidePropsType } from 'next';
import { join } from 'path';
import { useEffect } from 'react';

export default function DashboardUploadText({
  codeMeta,
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
      <UploadText codeMeta={codeMeta} />
    </Layout>
  );
}

export const getServerSideProps = withSafeConfig<{
  codeMeta: {
    ext: string;
    mime: string;
    name: string;
  }[];
}>(async () => {
  const read = await readFile(join(process.cwd(), 'code.json'));
  const codeMeta = JSON.parse(read.toString());

  return {
    codeMeta,
  };
});
