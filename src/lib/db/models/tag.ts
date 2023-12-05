export type Tag = {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  name: string;
  color: string;
  files?: {
    id: string;
  }[];
};

export const tagSelect = {
  id: true,
  createdAt: true,
  updatedAt: true,
  name: true,
  color: true,
  files: {
    select: {
      id: true,
    },
  },
};

export const tagSelectNoFiles = {
  id: true,
  createdAt: true,
  updatedAt: true,
  name: true,
  color: true,
};
