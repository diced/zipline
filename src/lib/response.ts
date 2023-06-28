import { NextApiRequest, NextApiResponse } from 'next';
import { User } from './db/queries/user';

export interface NextApiReq<Body = any, Query = any, Headers = any> extends NextApiRequest {
  query: Query & { [k: string]: string | string[] };
  body: Body;
  headers: Headers & { [k: string]: string };

  user?: User;
}

export type NextApiRes<Data = any> = NextApiResponse<Data>;

export function ok(res: NextApiRes, data: Record<string, unknown> = {}) {
  return res.status(200).json(data);
}

// Client wrong data, etc
export function badRequest(
  res: NextApiRes,
  message: string = 'Bad Request',
  data: Record<string, unknown> = {}
) {
  return res.status(400).json({
    error: message,
    ...data,
  });
}

// No authorization
export function unauthorized(
  res: NextApiRes,
  message: string = 'Unauthorized',
  data: Record<string, unknown> = {}
) {
  return res.status(401).json({
    error: message,
    ...data,
  });
}

// User's permission level does not meet requirements for this resource
export function forbidden(
  res: NextApiRes,
  message: string = 'Forbidden',
  data: Record<string, unknown> = {}
) {
  return res.status(403).json({
    error: message,
    ...data,
  });
}

export function notFound(res: NextApiRes, message: string = 'Not Found', data: Record<string, unknown> = {}) {
  return res.status(404).json({
    error: message,
    ...data,
  });
}

export function ratelimited(
  res: NextApiRes,
  retryAfter: number,
  message: string = 'Ratelimited',
  data: Record<string, unknown> = {}
) {
  res.setHeader('Retry-After', retryAfter);
  return res.status(429).json({
    error: message,
    retryAfter,
    ...data,
  });
}

export function serverError(
  res: NextApiRes,
  message: string = 'Internal Server Error',
  data: Record<string, unknown> = {}
) {
  return res.status(500).json({
    error: message,
    ...data,
  });
}

export function methodNotAllowed(
  res: NextApiRes,
  message: string = 'Method Not Allowed',
  data: Record<string, unknown> = {}
) {
  return res.status(405).json({
    error: message,
    method: res.req?.method || 'unknown',
    ...data,
  });
}
