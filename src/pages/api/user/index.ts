import { hashPassword } from '@/lib/crypto';
import { prisma } from '@/lib/db';
import { User, userSelect } from '@/lib/db/models/user';
import { combine } from '@/lib/middleware/combine';
import { method } from '@/lib/middleware/method';
import { ziplineAuth } from '@/lib/middleware/ziplineAuth';
import { NextApiReq, NextApiRes } from '@/lib/response';

export type ApiUserResponse = {
  user?: User;
  token?: string;
};

type EditBody = {
  username?: string;
  password?: string;
  avatar?: string;
  view?: {
    content?: string;
    embed?: boolean;
    embedTitle?: string;
    embedDescription?: string;
    embedColor?: string;
    embedSiteName?: string;
    enabled?: boolean;
    align?: 'left' | 'center' | 'right';
    showMimetype?: boolean;
  };
};

export async function handler(req: NextApiReq<EditBody>, res: NextApiRes<ApiUserResponse>) {
  if (req.method === 'GET') {
    return res.ok({ user: req.user, token: req.cookies.zipline_token });
  } else if (req.method === 'PATCH') {
    if (req.body.username) {
      const existing = await prisma.user.findUnique({
        where: {
          username: req.body.username,
        },
      });

      if (existing) return res.badRequest('Username already taken', { field: 'username' });
    }

    const user = await prisma.user.update({
      where: {
        id: req.user.id,
      },
      data: {
        ...(req.body.username && { username: req.body.username }),
        ...(req.body.password && { password: await hashPassword(req.body.password) }),
        ...(req.body.avatar !== undefined && { avatar: req.body.avatar || null }),
        ...(req.body.view && {
          view: {
            ...req.user.view,
            ...(req.body.view.enabled !== undefined && { enabled: req.body.view.enabled || false }),
            ...(req.body.view.content !== undefined && { content: req.body.view.content || null }),
            ...(req.body.view.embed !== undefined && { embed: req.body.view.embed || false }),
            ...(req.body.view.embedTitle !== undefined && { embedTitle: req.body.view.embedTitle || null }),
            ...(req.body.view.embedDescription !== undefined && {
              embedDescription: req.body.view.embedDescription || null,
            }),
            ...(req.body.view.embedColor !== undefined && { embedColor: req.body.view.embedColor || null }),
            ...(req.body.view.embedSiteName !== undefined && {
              embedSiteName: req.body.view.embedSiteName || null,
            }),
            ...(req.body.view.align !== undefined && { align: req.body.view.align || 'center' }),
            ...(req.body.view.showMimetype !== undefined && {
              showMimetype: req.body.view.showMimetype || false,
            }),
          },
        }),
      },
      select: {
        ...userSelect,
      },
    });

    return res.ok({ user, token: req.cookies.zipline_token });
  }
}

export default combine([method(['GET', 'PATCH']), ziplineAuth()], handler);
