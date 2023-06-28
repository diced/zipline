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
};

export async function getUser(
  where: Prisma.UserWhereInput | Prisma.UserWhereUniqueInput,
  options?: { password?: boolean; avatar?: boolean }
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
    },
  });
}

export async function getUserTokenRaw(
  where: Prisma.UserWhereInput | Prisma.UserWhereUniqueInput
): Promise<string | null> {
  const user = await prisma.user.findFirst({
    where,
    select: {
      token: true,
    },
  });

  if (!user) return null;

  return user.token;
}
