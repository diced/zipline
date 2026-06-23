import z from 'zod';
import { prisma } from './db';
import { Metric } from './db/models/metric';

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

export function getMetricsPoints(from?: Date, to?: Date): Promise<MetricsPoint[]> {
  if (from && to) {
    return prisma.$queryRaw<MetricsPoint[]>`
        SELECT
          id,
          "createdAt",
          (data->>'users')::int AS users,
          (data->>'files')::int AS files,
          (data->>'fileViews')::int AS "fileViews",
          (data->>'urls')::int AS urls,
          (data->>'urlViews')::int AS "urlViews",
          (data->>'storage')::bigint AS storage
        FROM "Metric"
        WHERE "createdAt" >= ${from} AND "createdAt" <= ${to}
        ORDER BY "createdAt" DESC
      `;
  }

  return prisma.$queryRaw<MetricsPoint[]>`
      SELECT
        id,
        "createdAt",
        (data->>'users')::int AS users,
        (data->>'files')::int AS files,
        (data->>'fileViews')::int AS "fileViews",
        (data->>'urls')::int AS urls,
        (data->>'urlViews')::int AS "urlViews",
        (data->>'storage')::bigint AS storage
      FROM "Metric"
      ORDER BY "createdAt" DESC
    `;
}

export function getLatestMetricsPoint(from?: Date, to?: Date): Promise<Metric | null> {
  return prisma.metric.findFirst({
    where: from && to ? { createdAt: { gte: from, lte: to } } : undefined,
    orderBy: { createdAt: 'desc' },
  });
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
