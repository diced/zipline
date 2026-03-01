import { IncompleteFileStatus } from '@/prisma/client';
import { z } from 'zod';

export type IncompleteFile = {
  id: string;
  createdAt: Date;
  updatedAt: Date;

  status: IncompleteFileStatus;
  chunksTotal: number;
  chunksComplete: number;

  userId: string;

  metadata: IncompleteFileMetadata;
};

export type IncompleteFileMetadata = z.infer<typeof metadataSchema>;
export const metadataSchema = z.object({
  file: z.object({
    filename: z.string(),
    type: z.string(),
    id: z.string(),
  }),
});

export const incompleteFileSchema = z.object({
  id: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),

  status: z.nativeEnum(IncompleteFileStatus),
  chunksTotal: z.number(),
  chunksComplete: z.number(),

  userId: z.string(),

  metadata: metadataSchema,
});
