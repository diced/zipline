import { combine } from '@/lib/middleware/combine';
import { method } from '@/lib/middleware/method';
import { ziplineAuth } from '@/lib/middleware/ziplineAuth';
import { NextApiReq, NextApiRes } from '@/lib/response';
import { clearZeros, clearZerosFiles } from '@/lib/server-util/clearZeros';

export type ApiServerClearZerosResponse = {
  status?: string;
  files?: Awaited<ReturnType<typeof clearZerosFiles>>;
};

export async function handler(req: NextApiReq, res: NextApiRes<ApiServerClearZerosResponse>) {
  const filesToDelete = await clearZerosFiles();

  if (req.method === 'GET') {
    return res.ok({ files: filesToDelete });
  }

  const response = await clearZeros(filesToDelete);

  return res.ok({ status: response });
}

export default combine([method(['GET', 'DELETE']), ziplineAuth({ administratorOnly: true })], handler);
