import { combine } from '@/lib/middleware/combine';
import { method } from '@/lib/middleware/method';
import { ziplineAuth } from '@/lib/middleware/ziplineAuth';
import { NextApiReq, NextApiRes } from '@/lib/response';

export type ApiLogoutResponse = {
  loggedOut?: boolean;
};

async function handler(_: NextApiReq, res: NextApiRes<ApiLogoutResponse>) {
  res.setHeader('Set-Cookie', 'zipline_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT');

  return res.ok({ loggedOut: true });
}

export default combine([method(['GET']), ziplineAuth()], handler);
