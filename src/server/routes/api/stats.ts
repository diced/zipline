import { ApiError } from '@/lib/api/errors';
import { config } from '@/lib/config';
import { metricSchema } from '@/lib/db/models/metric';
import { downsample, getLatestMetricsPoint, getMetricsPoints, metricsPointSchema } from '@/lib/metrics';
import { isAdministrator } from '@/lib/role';
import { zQsBoolean } from '@/lib/validation';
import { userMiddleware } from '@/server/middleware/user';
import typedPlugin from '@/server/typedPlugin';
import z from 'zod';

export const apiStatsResponseSchema = z.object({
  latest: metricSchema.nullable(),
  points: z.array(metricsPointSchema),
});

export type ApiStatsResponse = z.infer<typeof apiStatsResponseSchema>;

export const PATH = '/api/stats';

export default typedPlugin(
  async (server) => {
    server.get(
      PATH,
      {
        schema: {
          description:
            'Get instance-wide metrics and statistics for Zipline over a given date range or for all time.',
          querystring: z.object({
            from: z
              .string()
              .optional()
              .refine((val) => {
                if (!val) return true;
                const date = new Date(val);
                return !isNaN(date.getTime());
              }, 'Invalid date'),
            to: z
              .string()
              .optional()
              .refine((val) => {
                if (!val) return true;
                const date = new Date(val);
                return !isNaN(date.getTime());
              }, 'Invalid date'),
            all: zQsBoolean.default(false),
          }),
          response: {
            200: apiStatsResponseSchema,
          },
          tags: ['auth'],
        },
        preHandler: [userMiddleware],
      },
      async (req, res) => {
        if (!config.features.metrics) throw new ApiError(3001);

        if (config.features.metrics.adminOnly && !isAdministrator(req.user.role)) throw new ApiError(3000);

        const { from, to, all } = req.query;

        const fromDate = from ? new Date(from) : new Date(Date.now() - 86400000 * 7); // defaults to a week ago
        const toDate = to ? new Date(to) : new Date();

        if (!all) {
          if (fromDate > toDate) throw new ApiError(1058);
          if (fromDate > new Date()) throw new ApiError(1059);
        }

        const [latest, points] = await Promise.all([
          getLatestMetricsPoint(!all ? fromDate : undefined, !all ? toDate : undefined),
          all ? getMetricsPoints() : getMetricsPoints(fromDate, toDate),
        ]);

        if (latest && !config.features.metrics.showUserSpecific) {
          latest.data.filesUsers = [];
          latest.data.urlsUsers = [];
        }

        return res.send({
          latest,
          points: downsample(points),
        });
      },
    );
  },
  { name: PATH },
);
