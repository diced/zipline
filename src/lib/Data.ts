export interface User {
  username: string;
  password?: string;
  token?: string;
  administrator: boolean;
  _id?: any;
}

export interface Image {
  id: string;
  user: any;
  views: number;
  _id?: any;
}
