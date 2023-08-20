import Layout from '@/components/Layout';
import ViewFiles from '@/components/pages/users/ViewUserFiles';
import { prisma } from '@/lib/db';
import { User } from '@/lib/db/models/user';
import useLogin from '@/lib/hooks/useLogin';
import { withSafeConfig } from '@/lib/middleware/next/withSafeConfig';
import { parseUserToken } from '@/lib/middleware/ziplineAuth';
import { canInteract } from '@/lib/role';
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
      role: true,
    },
  });

  try {
    // eslint-disable-next-line no-var
    var currentUserToken = parseUserToken(ctx.req.cookies['zipline_token']);
  } catch (e) {
    return {
      notFound: true,
    };
  }

  const currentUser = await prisma.user.findUnique({
    where: {
      token: currentUserToken,
    },
    select: {
      id: true,
      username: true,
      role: true,
    },
  });

  if (!currentUser)
    return {
      notFound: true,
    };

  if (!canInteract(currentUser.role, user?.role))
    return {
      notFound: true,
    };

  return {
    user: user as User,
  };
});
