import { NextApiReq, NextApiRes } from '../response';
import { Handler } from './combine';

export function cors() {
  return (handler: Handler) => {
    return async (req: NextApiReq, res: NextApiRes) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, Accept');
      res.setHeader('Access-Control-Max-Age', '86400');

      if (req.method === 'OPTIONS') {
        return res.status(200).end();
      }

      return handler(req, res);
    };
  };
}
