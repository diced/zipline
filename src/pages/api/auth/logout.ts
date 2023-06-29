import { combine } from '@/lib/middleware/combine';
import { cors } from '@/lib/middleware/cors';
import { method } from '@/lib/middleware/method';
import { ziplineAuth } from '@/lib/middleware/ziplineAuth';
import { NextApiReq, NextApiRes } from '@/lib/response';

type Data = {
  loggedOut?: boolean;
};

async function handler(req: NextApiReq, res: NextApiRes<Data>) {
  res.setHeader('Set-Cookie', `zipline_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`);

  return res.ok({ loggedOut: true });
}

export default combine([cors(), method(['POST']), ziplineAuth()], handler);
