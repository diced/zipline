import { combine } from '@/lib/middleware/combine';
import { method } from '@/lib/middleware/method';
import { ziplineAuth } from '@/lib/middleware/ziplineAuth';
import { NextApiReq, NextApiRes } from '@/lib/response';
import { clearTemp } from '@/lib/server-util/clearTemp';

export type ApiServerClearTempResponse = {
  status?: string;
};

export async function handler(_: NextApiReq, res: NextApiRes<ApiServerClearTempResponse>) {
  const response = await clearTemp();

  return res.ok({ status: response });
}

export default combine([method(['DELETE']), ziplineAuth({ administratorOnly: true })], handler);
