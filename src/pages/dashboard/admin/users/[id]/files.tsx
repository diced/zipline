import Layout from '@/components/Layout';
import ViewFiles from '@/components/pages/users/ViewUserFiles';
import { prisma } from '@/lib/db';
import { User, userSelect } from '@/lib/db/models/user';
import useLogin from '@/lib/hooks/useLogin';
import { withSafeConfig } from '@/lib/middleware/next/withSafeConfig';
import { LoadingOverlay } from '@mantine/core';
import { InferGetServerSidePropsType } from 'next';

export default function DashboardIndex({
  user,
  config,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const { loading } = useLogin();
  if (loading) return <LoadingOverlay visible />;
  if (!user) return null;

  return (
    <Layout config={config}>
      <ViewFiles user={user} />
    </Layout>
  );
}

export const getServerSideProps = withSafeConfig(async (ctx) => {
  const user = await prisma.user.findUnique({
    where: {
      id: ctx.query.id as string,
    },
    select: {
      id: true,
      username: true,
    },
  });
  // if (!user) return { notFound: true };
  // if (!user.administrator) return { notFound: true };

  return {
    user: user as User,
  };
});
