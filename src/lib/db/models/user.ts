export type User = {
  id: string;
  username: string;
  createdAt: Date;
  updatedAt: Date;
  role: 'USER' | 'ADMIN' | 'SUPERADMIN';
  avatar?: string | null;
  password?: string | null;
  token?: string | null;
};

export const userSelect = {
  id: true,
  username: true,
  createdAt: true,
  updatedAt: true,
  role: true,
};
