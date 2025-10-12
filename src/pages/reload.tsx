import { reloadSettings } from '@/lib/config';
import { prisma } from '@/lib/db';
import { isAdministrator } from '@/lib/role';
import { getSession } from '@/server/session';
import { GetServerSideProps } from 'next';

export default function Reload() {
  return null;
}

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const session = await getSession(ctx.req, ctx.res);
  if (!session.id || !session.sessionId)
    return {
      redirect: {
        destination: '/auth/login',
        permanent: false,
      },
    };

  const user = await prisma.user.findFirst({
    where: {
      sessions: {
        has: session.sessionId,
      },
    },
  });

  if (!user) return { notFound: true };
  if (!isAdministrator(user.role)) return { notFound: true };

  await reloadSettings();

  return {
    props: {},
  };
};
