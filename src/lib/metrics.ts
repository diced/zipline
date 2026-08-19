import z from 'zod';
import { db } from './db';
import { metricSchema, type Metric } from './db/models/metric';
import { metrics } from './db/schema';
import { and, desc, gte, lte, sql } from 'drizzle-orm';

export const metricsPointSchema = z.object({
  id: z.string(),
  createdAt: z.date(),
  users: z.number(),
  files: z.number(),
  fileViews: z.number(),
  urls: z.number(),
  urlViews: z.number(),
  storage: z.bigint(),
});

export type MetricsPoint = z.infer<typeof metricsPointSchema>;

export async function getMetricsPoints(from?: Date, to?: Date): Promise<MetricsPoint[]> {
  const dateRange = from && to ? and(gte(metrics.createdAt, from), lte(metrics.createdAt, to)) : undefined;
  const points = await db
    .select({
      id: metrics.id,
      createdAt: metrics.createdAt,
      users: sql<number>`(${metrics.data}->>'users')::int`,
      files: sql<number>`(${metrics.data}->>'files')::int`,
      fileViews: sql<number>`(${metrics.data}->>'fileViews')::int`,
      urls: sql<number>`(${metrics.data}->>'urls')::int`,
      urlViews: sql<number>`(${metrics.data}->>'urlViews')::int`,
      storage: sql<string>`(${metrics.data}->>'storage')::bigint`,
    })
    .from(metrics)
    .where(dateRange)
    .orderBy(desc(metrics.createdAt));

  return points.map((point) =>
    metricsPointSchema.parse({
      ...point,
      storage: BigInt(point.storage),
    }),
  );
}

export async function getLatestMetricsPoint(from?: Date, to?: Date): Promise<Metric | null> {
  const dateRange = from && to ? and(gte(metrics.createdAt, from), lte(metrics.createdAt, to)) : undefined;
  const row = await db.query.metrics.findFirst({
    where: dateRange,
    orderBy: desc(metrics.createdAt),
  });
  return row ? metricSchema.parse(row) : null;
}

export function downsample(points: MetricsPoint[], max: number = 500): MetricsPoint[] {
  if (points.length <= max) return points;

  const indices = new Set<number>();
  indices.add(0);
  indices.add(points.length - 1);

  const middle = max - 2;
  const step = (points.length - 1) / (middle + 1);
  for (let i = 1; i <= middle; i++) {
    indices.add(Math.round(i * step));
  }

  return [...indices].sort((a, b) => a - b).map((i) => points[i]!);
}
