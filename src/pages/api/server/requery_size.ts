import { combine } from '@/lib/middleware/combine';
import { method } from '@/lib/middleware/method';
import { ziplineAuth } from '@/lib/middleware/ziplineAuth';
import { NextApiReq, NextApiRes } from '@/lib/response';
import { requerySize } from '@/lib/server-util/requerySize';

export type ApiServerRequerySizeResponse = {
  status?: string;
};

type Body = {
  forceDelete?: boolean;
  forceUpdate?: boolean;
};

export async function handler(req: NextApiReq<Body>, res: NextApiRes<ApiServerRequerySizeResponse>) {
  const response = await requerySize({
    forceDelete: req.body.forceDelete || false,
    forceUpdate: req.body.forceUpdate || false,
  });

  return res.ok({ status: response });
}

export default combine([method(['POST']), ziplineAuth({ administratorOnly: true })], handler);
