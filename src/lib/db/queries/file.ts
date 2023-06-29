import { Prisma } from '@prisma/client';
import { prisma } from '..';

export type File = {
  createdAt: Date;
  updatedAt: Date;
  deletesAt: Date | null;
  favorite: boolean;
  id: string;
  originalName: string;
  name: string;
  path: string;
  size: number;
  type: string;
  views: number;
  zeroWidthSpace: string | null;
  password?: string | null;
};

export type FileSelectOptions = { password?: boolean };

export async function getFile(
  where: Prisma.FileWhereInput | Prisma.FileWhereUniqueInput,
  options?: FileSelectOptions
): Promise<File | null> {
  return prisma.file.findFirst({
    where,
    select: {
      createdAt: true,
      updatedAt: true,
      deletesAt: true,
      favorite: true,
      id: true,
      originalName: true,
      name: true,
      path: true,
      size: true,
      type: true,
      views: true,
      zeroWidthSpace: true,
      password: options?.password || false,
    },
  });
}

export async function createFile(data: Prisma.FileCreateInput, options?: FileSelectOptions): Promise<File> {
  return prisma.file.create({
    data,
    select: {
      createdAt: true,
      updatedAt: true,
      deletesAt: true,
      favorite: true,
      id: true,
      originalName: true,
      name: true,
      path: true,
      size: true,
      type: true,
      views: true,
      zeroWidthSpace: true,
      password: options?.password || false,
    },
  });
}
