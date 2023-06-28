import { User } from '@/lib/db/queries/user';
import { combine } from '@/lib/middleware/combine';
import { cors } from '@/lib/middleware/cors';
import { method } from '@/lib/middleware/method';
import { NextApiReq, NextApiRes } from '@/lib/response';

type Response = {
  user: User;
};

export async function handler(req: NextApiReq, res: NextApiRes<Response>) {}

export default combine([cors(), method(['GET', 'POST', 'PATCH'])], handler);
