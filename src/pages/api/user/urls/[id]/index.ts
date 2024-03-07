import { prisma } from '@/lib/db';
import { Url } from '@/lib/db/models/url';
import { combine } from '@/lib/middleware/combine';
import { method } from '@/lib/middleware/method';
import { ziplineAuth } from '@/lib/middleware/ziplineAuth';
import { NextApiReq, NextApiRes } from '@/lib/response';

export type ApiUserUrlsIdResponse = Url;

type Query = {
  id: string;
};

export async function handler(req: NextApiReq<unknown, Query>, res: NextApiRes<ApiUserUrlsIdResponse>) {
  const { id } = req.query;

  const url = await prisma.url.findFirst({
    where: {
      id: id,
    },
  });

  if (!url) return res.notFound();
  if (url.userId !== req.user.id) return res.forbidden('You do not own this URL');

  if (req.method === 'DELETE') {
    const url = await prisma.url.delete({
      where: {
        id: id,
      },
    });

    return res.ok(url);
  }

  return res.ok(url);
}

export default combine([method(['GET', 'DELETE']), ziplineAuth()], handler);
