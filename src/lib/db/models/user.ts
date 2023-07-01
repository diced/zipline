import { Prisma } from '@prisma/client';

export type User = {
  id: string;
  username: string;
  createdAt: Date;
  updatedAt: Date;
  administrator: boolean;
  avatar?: string | null;
  password?: string | null;
  token?: string | null;
};

export const userSelect = {
  id: true,
  username: true,
  createdAt: true,
  updatedAt: true,
  administrator: true,
};
