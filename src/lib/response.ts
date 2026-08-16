export type ErrorBody = {
  data?: any;
  statusCode?: number;
  error?: string;

  [key: string]: any;
};
