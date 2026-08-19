import { db } from '@/lib/db';
import { metrics } from '@/lib/db/schema';
import { and, desc, gte, lte } from 'drizzle-orm';
import { createSelectSchema } from 'drizzle-zod';
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

export const metricSchema = createSelectSchema(metrics, { data: metricDataSchema });

export type Metric = z.infer<typeof metricSchema>;

function parseMetric(row: typeof metrics.$inferSelect): Metric {
  return metricSchema.parse(row);
}

export async function createMetric(data: MetricData): Promise<Metric> {
  const [created] = await db
    .insert(metrics)
    .values({ data: data as typeof metrics.$inferInsert.data })
    .returning();
  if (!created) throw new Error('Failed to create metric');
  return parseMetric(created);
}

export async function createMetrics(data: MetricData[]): Promise<Metric[]> {
  if (data.length === 0) return [];

  const created = await db
    .insert(metrics)
    .values(data.map((entry) => ({ data: entry as typeof metrics.$inferInsert.data })))
    .returning();
  return created.map(parseMetric);
}

export async function listMetrics(): Promise<Metric[]> {
  return (await db.query.metrics.findMany()).map(parseMetric);
}

export async function getLatestMetric(from?: Date, to?: Date): Promise<Metric | null> {
  const dateRange = from && to ? and(gte(metrics.createdAt, from), lte(metrics.createdAt, to)) : undefined;
  const row = await db.query.metrics.findFirst({
    where: dateRange,
    orderBy: desc(metrics.createdAt),
  });
  return row ? parseMetric(row) : null;
}
