import { z } from 'zod';

export type Metric = {
  id: string;
  createdAt: Date;
  updatedAt: Date;

  data: MetricData;
};

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
      username: z.string(),
      sum: z.number(),
      storage: z.number(),
      views: z.number(),
    }),
  ),
  urlsUsers: z.array(
    z.object({
      username: z.string(),
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

export function percentChange(a: number, b: number): number {
  return ((b - a) / a) * 100;
}
