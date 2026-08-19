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
  const number = (value: unknown) => Number(value ?? 0);
  const [fileRows, urlRows] = await Promise.all([
    db
      .select({
        count: count(),
        views: sql<number>`coalesce(sum(${files.views}), 0)`.mapWith(number),
        storage: sql<number>`coalesce(sum(${files.size}), 0)`.mapWith(number),
      })
      .from(files)
      .where(userId ? eq(files.userId, userId) : undefined),
    db
      .select({
        count: count(),
        views: sql<number>`coalesce(sum(${urls.views}), 0)`.mapWith(number),
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
  const number = (value: unknown) => Number(value ?? 0);
  const [fileRows, urlRows, types] = await Promise.all([
    db
      .select({
        count: count(),
        favorites: sql<number>`count(*) filter (where ${files.favorite} = true)`.mapWith(number),
        views: sql<number>`coalesce(sum(${files.views}), 0)`.mapWith(number),
        avgViews: sql<number>`coalesce(avg(${files.views}), 0)`.mapWith(number),
        storage: sql<number>`coalesce(sum(${files.size}), 0)`.mapWith(number),
        avgStorage: sql<number>`coalesce(avg(${files.size}), 0)`.mapWith(number),
      })
      .from(files)
      .where(eq(files.userId, userId)),
    db
      .select({
        count: count(),
        views: sql<number>`coalesce(sum(${urls.views}), 0)`.mapWith(number),
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
  const number = (value: unknown) => Number(value ?? 0);
  const [fileRows, urlRows, userRows, filesByUser, urlsByUser, types] = await Promise.all([
    db
      .select({
        count: count(),
        views: sql<number>`coalesce(sum(${files.views}), 0)`.mapWith(number),
        storage: sql<number>`coalesce(sum(${files.size}), 0)`.mapWith(number),
      })
      .from(files),
    db
      .select({
        count: count(),
        views: sql<number>`coalesce(sum(${urls.views}), 0)`.mapWith(number),
      })
      .from(urls),
    db.select({ count: count() }).from(users),
    db
      .select({
        username: users.username,
        count: count(),
        views: sql<number>`coalesce(sum(${files.views}), 0)`.mapWith(number),
        storage: sql<number>`coalesce(sum(${files.size}), 0)`.mapWith(number),
      })
      .from(files)
      .leftJoin(users, eq(files.userId, users.id))
      .groupBy(files.userId, users.username),
    db
      .select({
        username: users.username,
        count: count(),
        views: sql<number>`coalesce(sum(${urls.views}), 0)`.mapWith(number),
      })
      .from(urls)
      .leftJoin(users, eq(urls.userId, users.id))
      .groupBy(urls.userId, users.username),
    db.select({ type: files.type, count: count() }).from(files).groupBy(files.type),
  ]);

  const file = fileRows[0] ?? { count: 0, views: 0, storage: 0 };
  const url = urlRows[0] ?? { count: 0, views: 0 };
  const user = userRows[0] ?? { count: 0 };

  return {
    files: file.count,
    urls: url.count,
    users: user.count,
    storage: file.storage,

    fileViews: file.views,
    urlViews: url.views,

    filesUsers: filesByUser.map((x) => ({
      username: x.username,
      sum: x.count,
      storage: x.storage,
      views: x.views,
    })),
    urlsUsers: urlsByUser.map((x) => ({ username: x.username, sum: x.count, views: x.views })),

    types: types.map((x) => ({ type: x.type, sum: x.count })),
  };
}
