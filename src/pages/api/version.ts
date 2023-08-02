import { combine } from '@/lib/middleware/combine';
import { method } from '@/lib/middleware/method';
import { ziplineAuth } from '@/lib/middleware/ziplineAuth';
import { NextApiReq, NextApiRes } from '@/lib/response';
import packageJson from '../../../package.json';

export type ApiVersionResponse = {
  version: string;
};

export async function handler(_: NextApiReq, res: NextApiRes<ApiVersionResponse>) {
  return res.ok({ version: packageJson.version });
}

export default combine([method(['GET']), ziplineAuth({ administratorOnly: true })], handler);
