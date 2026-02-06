export type File = {
  fieldname: string;
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
};

export type Cookies = {
  zipline_token?: string;
};

export type ErrorBody = {
  data?: any;
  statusCode?: number;
  error?: string;

  [key: string]: any;
};
