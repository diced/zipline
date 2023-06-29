import { Prisma } from '@prisma/client';
import { prisma } from '..';

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

export type UserSelectOptions = { password?: boolean; avatar?: boolean; token?: boolean };

export async function getUser(
  where: Prisma.UserWhereInput | Prisma.UserWhereUniqueInput,
  options?: UserSelectOptions
): Promise<User | null> {
  return prisma.user.findFirst({
    where,
    select: {
      administrator: true,
      avatar: options?.avatar || false,
      id: true,
      createdAt: true,
      updatedAt: true,
      password: options?.password || false,
      username: true,
      token: options?.token || false,
    },
  });
}

export async function updateUser(
  where: Prisma.UserWhereUniqueInput,
  data: Prisma.UserUpdateInput,
  options?: UserSelectOptions
): Promise<User> {
  return prisma.user.update({
    where,
    data,
    select: {
      administrator: true,
      avatar: options?.avatar || false,
      id: true,
      createdAt: true,
      updatedAt: true,
      password: options?.password || false,
      username: true,
      token: options?.token || false,
    },
  });
}
