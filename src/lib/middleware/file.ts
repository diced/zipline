import { NextApiReq, NextApiRes } from '../response';
import { Handler } from './combine';
import multer from 'multer';

const uploader = multer();

export function file() {
  return (handler: Handler) => {
    return async (req: NextApiReq, res: NextApiRes) => {
      await new Promise((resolve, reject) => {
        uploader.array('file')(req as never, res as never, (result: unknown) => {
          if (result instanceof Error) {
            console.error(result);
            reject(result);
          }
          resolve(result);
        });
      });

      return handler(req, res);
    };
  };
}
