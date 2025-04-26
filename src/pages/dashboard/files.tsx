import Layout from '@/components/Layout';
import DashboardFiles from '@/components/pages/files';
import useLogin from '@/lib/hooks/useLogin';
import { withSafeConfig } from '@/lib/middleware/next/withSafeConfig';
import { LoadingOverlay } from '@mantine/core';
import { InferGetServerSidePropsType } from 'next';
import { readFile } from 'fs/promises';
import { join } from 'path';

export default function DashboardFilesPage({
  config,
  codeMeta
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const { loading } = useLogin();
  if (loading) return <LoadingOverlay visible />;

  return (
    <Layout config={config}>
      <DashboardFiles codeMeta={codeMeta} />
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

DashboardFilesPage.title = 'Files';
