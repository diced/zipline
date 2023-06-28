import { NextApiReq, NextApiRes } from '../response';

export function combine(middleware: Middleware[], handler: Handler) {
  return middleware.reduceRight((handler, middleware) => {
    return middleware(handler);
  }, handler);
}

export type Middleware = (...args: any[]) => Handler;
export type Handler = (req: NextApiReq, res: NextApiRes) => Promise<any>;
