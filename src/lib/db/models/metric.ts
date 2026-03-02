import { z } from 'zod';

export type MetricData = z.infer<typeof metricDataSchema>;

export const metricDataSchema = z.object({
  users: z.number(),
  files: z.number(),
  fileViews: z.number(),
  urls: z.number(),
  urlViews: z.number(),
  storage: z.number(),

  filesUsers: z.array(
    z.object({
      username: z.string().nullable(),
      sum: z.number(),
      storage: z.number(),
      views: z.number(),
    }),
  ),
  urlsUsers: z.array(
    z.object({
      username: z.string().nullable(),
      sum: z.number(),
      views: z.number(),
    }),
  ),
  types: z.array(
    z.object({
      type: z.string(),
      sum: z.number(),
    }),
  ),
});

export const metricSchema = z.object({
  id: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  data: metricDataSchema,
});

export type Metric = z.infer<typeof metricSchema>;
