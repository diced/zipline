import { reloadSettings } from '@/lib/config';
import { prisma } from '@/lib/db';
import { isAdministrator } from '@/lib/role';
import { getSession } from '@/server/session';
import { GetServerSideProps } from 'next';

/*
  Serves as a "reload config", since we have to reload the config on next.js as well as the server.
  This takes care of the next.js side.
  
  It can be called by fetch('/reload') to do it manually/after saving settings.
    After that you have to reload the page to see the changes.
*/

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
