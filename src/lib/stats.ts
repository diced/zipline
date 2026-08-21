import { db } from './db';
import type { MetricData } from './db/models/metric';
import { files, urls, users, userSessions } from './db/schema';
import { and, count, eq, gte, sql } from 'drizzle-orm';

export type DatabaseTotals = {
  files: number;
  urls: number;
  storage: number;
  fileViews: number;
  urlViews: number;
};

export type UserStats = {
  filesUploaded: number;
  favoriteFiles: number;
  views: number;
  avgViews: number;
  storageUsed: number;
  avgStorageUsed: number;
  urlsCreated: number;
  urlViews: number;
  sortTypeCount: Record<string, number>;
};

export async function queryTotals(userId?: string): Promise<DatabaseTotals> {
  const [fileRows, urlRows] = await Promise.all([
    db
      .select({
        count: count(),
        views: sql<number>`coalesce(sum(${files.views}), 0)`.mapWith(Number),
        storage: sql<number>`coalesce(sum(${files.size}), 0)`.mapWith(Number),
      })
      .from(files)
      .where(userId ? eq(files.userId, userId) : undefined),
    db
      .select({
        count: count(),
        views: sql<number>`coalesce(sum(${urls.views}), 0)`.mapWith(Number),
      })
      .from(urls)
      .where(userId ? eq(urls.userId, userId) : undefined),
  ]);

  const file = fileRows[0] ?? { count: 0, views: 0, storage: 0 };
  const url = urlRows[0] ?? { count: 0, views: 0 };
  return {
    files: file.count,
    urls: url.count,
    storage: file.storage,
    fileViews: file.views,
    urlViews: url.views,
  };
}

export async function queryUserStats(userId: string): Promise<UserStats> {
  const [fileRows, urlRows, types] = await Promise.all([
    db
      .select({
        count: count(),
        favorites: sql<number>`count(*) filter (where ${files.favorite} = true)`.mapWith(Number),
        views: sql<number>`coalesce(sum(${files.views}), 0)`.mapWith(Number),
        avgViews: sql<number>`coalesce(avg(${files.views}), 0)`.mapWith(Number),
        storage: sql<number>`coalesce(sum(${files.size}), 0)`.mapWith(Number),
        avgStorage: sql<number>`coalesce(avg(${files.size}), 0)`.mapWith(Number),
      })
      .from(files)
      .where(eq(files.userId, userId)),
    db
      .select({
        count: count(),
        views: sql<number>`coalesce(sum(${urls.views}), 0)`.mapWith(Number),
      })
      .from(urls)
      .where(eq(urls.userId, userId)),
    db
      .select({ type: files.type, count: count() })
      .from(files)
      .where(eq(files.userId, userId))
      .groupBy(files.type),
  ]);

  const file = fileRows[0] ?? {
    count: 0,
    favorites: 0,
    views: 0,
    avgViews: 0,
    storage: 0,
    avgStorage: 0,
  };
  const url = urlRows[0] ?? { count: 0, views: 0 };

  return {
    filesUploaded: file.count,
    favoriteFiles: file.favorites,
    views: file.views,
    avgViews: file.avgViews,
    storageUsed: file.storage,
    avgStorageUsed: file.avgStorage,
    urlsCreated: url.count,
    urlViews: url.views,
    sortTypeCount: Object.fromEntries(types.map((entry) => [entry.type, entry.count])),
  };
}

export async function queryUserActivityDates(userId: string, since: Date) {
  const [uploads, logins] = await Promise.all([
    db
      .select({ createdAt: files.createdAt })
      .from(files)
      .where(and(eq(files.userId, userId), gte(files.createdAt, since))),
    db
      .select({ createdAt: userSessions.createdAt })
      .from(userSessions)
      .where(and(eq(userSessions.userId, userId), gte(userSessions.createdAt, since))),
  ]);

  return { uploads, logins };
}

export async function queryStats(): Promise<MetricData> {
  const [fileRows, urlRows, userCount, filesByUser, urlsByUser, types] = await Promise.all([
    db
      .select({
        count: count(),
        views: sql<number>`coalesce(sum(${files.views}), 0)`.mapWith(Number),
        storage: sql<number>`coalesce(sum(${files.size}), 0)`.mapWith(Number),
      })
      .from(files),
    db
      .select({
        count: count(),
        views: sql<number>`coalesce(sum(${urls.views}), 0)`.mapWith(Number),
      })
      .from(urls),
    db.$count(users),
    db
      .select({
        username: users.username,
        sum: count(),
        views: sql<number>`coalesce(sum(${files.views}), 0)`.mapWith(Number),
        storage: sql<number>`coalesce(sum(${files.size}), 0)`.mapWith(Number),
      })
      .from(files)
      .leftJoin(users, eq(files.userId, users.id))
      .groupBy(files.userId, users.username),
    db
      .select({
        username: users.username,
        sum: count(),
        views: sql<number>`coalesce(sum(${urls.views}), 0)`.mapWith(Number),
      })
      .from(urls)
      .leftJoin(users, eq(urls.userId, users.id))
      .groupBy(urls.userId, users.username),
    db.select({ type: files.type, sum: count() }).from(files).groupBy(files.type),
  ]);

  const file = fileRows[0] ?? { count: 0, views: 0, storage: 0 };
  const url = urlRows[0] ?? { count: 0, views: 0 };

  return {
    files: file.count,
    urls: url.count,
    users: userCount,
    storage: file.storage,

    fileViews: file.views,
    urlViews: url.views,

    filesUsers: filesByUser,
    urlsUsers: urlsByUser,
    types,
  };
}
