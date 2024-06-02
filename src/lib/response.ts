import { NextApiRequest, NextApiResponse } from 'next';

export interface File {
  fieldname: string;
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

export type Cookies = {
  zipline_token?: string;
};

export interface NextApiReq<Body = any, Query = any, Headers = any> extends NextApiRequest {
  query: Query & { [k: string]: string | string[] };
  body: Body;
  headers: Headers & { [k: string]: string };
  cookies: Cookies & { [k: string]: string };

  files?: File[];
}

export type ErrorBody = {
  message?: string;
  data?: any;
  statusCode?: number;
  error?: string;

  [key: string]: any;
};

export interface NextApiRes<Data = any> extends NextApiResponse {
  ok: (data?: Data) => void;
  badRequest: (message?: string, data?: ErrorBody) => void;
  unauthorized: (message?: string, data?: ErrorBody) => void;
  forbidden: (message?: string, data?: ErrorBody) => void;
  notFound: (message?: string, data?: ErrorBody) => void;
  tooLarge: (message?: string, data?: ErrorBody) => void;
  ratelimited: (retryAfter: number, message?: string, data?: ErrorBody) => void;
  serverError: (message?: string, data?: ErrorBody) => void;
  methodNotAllowed: (message?: string, data?: ErrorBody) => void;
}
