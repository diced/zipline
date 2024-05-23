import { NextApiReq, NextApiRes } from '../response';

import { cors } from './cors';
import { functions } from './functions';

export function combine(middleware: Middleware[], handler: Handler) {
  middleware.unshift(functions(), cors());

  return middleware.reduceRight((handler, middleware) => {
    return middleware(handler);
  }, handler);
}

export type Middleware = (...args: any[]) => Handler;
export type Handler = (req: NextApiReq, res: NextApiRes) => Promise<any>;
