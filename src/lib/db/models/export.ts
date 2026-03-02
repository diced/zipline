import z from 'zod';

export const exportSchema = z.object({
  id: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),

  completed: z.boolean(),
  path: z.string(),
  files: z.number(),
  size: z.string(),
});

export type Export = z.infer<typeof exportSchema>;
