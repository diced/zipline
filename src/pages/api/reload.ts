import { reloadSettings } from '@/lib/config';
import { prisma } from '@/lib/db';
import { isAdministrator } from '@/lib/role';
import { getSession } from '@/server/session';
import { NextApiRequest, NextApiResponse } from 'next/types';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession(req, res);
  if (!session.id || !session.sessionId) return res.redirect(302, '/auth/login');

  const user = await prisma.user.findFirst({
    where: {
      sessions: {
        has: session.sessionId,
      },
    },
  });

  if (!user) return res.redirect(302, '/dashboard');
  if (!isAdministrator(user.role)) return res.redirect(302, '/dashboard');

  await reloadSettings();

  return res.json({ success: true });
}
