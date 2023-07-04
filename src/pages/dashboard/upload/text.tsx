import Layout from '@/components/Layout';
import UploadText from '@/components/pages/upload/Text';
import useLogin from '@/lib/hooks/useLogin';
import { LoadingOverlay } from '@mantine/core';
import { readFile } from 'fs/promises';
import { GetServerSideProps, InferGetServerSidePropsType } from 'next';
import { join } from 'path';

export default function DashboardUploadText({
  codeMeta,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const { loading } = useLogin();

  if (loading) return <LoadingOverlay visible />;

  return (
    <Layout>
      <UploadText codeMeta={codeMeta} />
    </Layout>
  );
}

export const getServerSideProps: GetServerSideProps<{
  codeMeta: {
    ext: string;
    mime: string;
    name: string;
  }[];
}> = async () => {
  const read = await readFile(join(process.cwd(), 'code.json'));
  const codeMeta = JSON.parse(read.toString());

  return {
    props: {
      codeMeta,
    },
  };
};
