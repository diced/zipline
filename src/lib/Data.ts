export interface User {
  username: string;
  password?: string;
  token?: string;
  administrator: boolean;
  _id?: any;
}