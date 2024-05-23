import { ErrorBody, NextApiReq, NextApiRes } from '../response';
import { Handler } from './combine';

export function functions() {
  return (handler: Handler) => {
    return async (req: NextApiReq, res: NextApiRes) => {
      // res.json = (data?: any) => {
      //   return res.send(
      //     JSON.stringify(data, (key, value) => (typeof value === 'bigint' ? Number(value) : value)),
      //   );
      // };

      res.ok = (data?: any) => {
        return res.status(200).json(data);
      };

      res.badRequest = (message: string = 'Bad Request', data: ErrorBody = {}) => {
        return res.status(400).json({
          code: 400,
          message,
          ...data,
        });
      };

      res.unauthorized = (message: string = 'Unauthorized', data: ErrorBody = {}) => {
        return res.status(401).json({
          code: 401,
          message,
          ...data,
        });
      };

      res.forbidden = (message: string = 'Forbidden', data: ErrorBody = {}) => {
        return res.status(403).json({
          code: 403,
          message,
          ...data,
        });
      };

      res.notFound = (message: string = 'Not Found', data: ErrorBody = {}) => {
        return res.status(404).json({
          code: 404,
          message,
          ...data,
        });
      };

      res.tooLarge = (message: string = 'Payload Too Large', data: ErrorBody = {}) => {
        return res.status(413).json({
          code: 413,
          message,
          ...data,
        });
      };

      res.ratelimited = (retryAfter: number, message: string = 'Ratelimited', data: ErrorBody = {}) => {
        res.setHeader('Retry-After', retryAfter);
        return res.status(429).json({
          code: 429,
          message,
          retryAfter,
          ...data,
        });
      };

      res.serverError = (message: string = 'Internal Server Error', data: ErrorBody = {}) => {
        return res.status(500).json({
          code: 500,
          message,
          ...data,
        });
      };

      res.methodNotAllowed = () => {
        return res.status(405).json({
          code: 405,
          message: 'Method Not Allowed',
          method: req.method || 'unknown',
        });
      };

      return handler(req, res);
    };
  };
}
