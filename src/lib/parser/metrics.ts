import { queryTotals } from '../stats';

export type ParseValueMetrics = {
  files?: number;
  urls?: number;
  storage?: number;
  fileViews?: number;
  urlViews?: number;
};

export async function parserMetrics(id: string): Promise<{
  metricsUser: ParseValueMetrics;
  metricsZipline: ParseValueMetrics;
}> {
  const [user, zipline] = await Promise.all([queryTotals(id), queryTotals()]);

  return {
    metricsUser: {
      files: user.files,
      urls: user.urls,
      storage: user.storage,
      fileViews: user.fileViews,
      urlViews: user.urlViews,
    },
    metricsZipline: {
      files: zipline.files,
      urls: zipline.urls,
      storage: zipline.storage,
      fileViews: zipline.fileViews,
      urlViews: zipline.urlViews,
    },
  };
}
