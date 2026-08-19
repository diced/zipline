import { db } from '@/lib/db';
import { metrics } from '@/lib/db/schema';
import { firstOrNull } from '@/lib/db/utils';
import { and, desc, gte, lte } from 'drizzle-orm';
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

function parseMetric(row: typeof metrics.$inferSelect): Metric {
  return metricSchema.parse({
    ...row,
    data: metricDataSchema.parse(row.data),
  });
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
  return (await db.select().from(metrics)).map(parseMetric);
}

export async function getLatestMetric(from?: Date, to?: Date): Promise<Metric | null> {
  const dateRange = from && to ? and(gte(metrics.createdAt, from), lte(metrics.createdAt, to)) : undefined;
  const row = firstOrNull(
    await db.select().from(metrics).where(dateRange).orderBy(desc(metrics.createdAt)).limit(1),
  );
  return row ? parseMetric(row) : null;
}
