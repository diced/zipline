import { prisma } from '@/lib/db';
import { userMiddleware } from '@/server/middleware/user';
import typedPlugin from '@/server/typedPlugin';
import dayjs from 'dayjs';
import z from 'zod';

export type ApiUserActivityDay = {
  date: string;
  uploads: number;
  logins: number;
};

export type ApiUserActivityResponse = {
  days: number;
  series: ApiUserActivityDay[];
  totals: {
    uploads: number;
    logins: number;
  };
};

export const PATH = '/api/user/activity';

const MAX_DAYS = 90;
const DEFAULT_DAYS = 14;

export default typedPlugin(
  async (server) => {
    server.get(
      PATH,
      {
        schema: {
          description: 'Daily upload and login counts for the authenticated user over a recent window.',
          querystring: z.object({
            days: z.coerce.number().int().min(1).max(MAX_DAYS).default(DEFAULT_DAYS),
          }),
          response: {
            200: z.object({
              days: z.number(),
              series: z.array(
                z.object({
                  date: z.string(),
                  uploads: z.number(),
                  logins: z.number(),
                }),
              ),
              totals: z.object({
                uploads: z.number(),
                logins: z.number(),
              }),
            }),
          },
          tags: ['auth'],
        },
        preHandler: [userMiddleware],
      },
      async (req, res) => {
        const days = req.query.days;
        const start = dayjs()
          .subtract(days - 1, 'day')
          .startOf('day')
          .toDate();

        const [files, sessions] = await Promise.all([
          prisma.file.findMany({
            where: {
              userId: req.user.id,
              createdAt: { gte: start },
            },
            select: { createdAt: true },
          }),
          prisma.userSession.findMany({
            where: {
              userId: req.user.id,
              createdAt: { gte: start },
            },
            select: { createdAt: true },
          }),
        ]);

        const uploadsByDay = new Map<string, number>();
        const loginsByDay = new Map<string, number>();

        for (const file of files) {
          const key = dayjs(file.createdAt).format('YYYY-MM-DD');
          uploadsByDay.set(key, (uploadsByDay.get(key) ?? 0) + 1);
        }

        for (const session of sessions) {
          const key = dayjs(session.createdAt).format('YYYY-MM-DD');
          loginsByDay.set(key, (loginsByDay.get(key) ?? 0) + 1);
        }

        const series: ApiUserActivityDay[] = [];
        let totalUploads = 0;
        let totalLogins = 0;

        for (let i = days - 1; i >= 0; i--) {
          const day = dayjs().subtract(i, 'day').startOf('day');
          const key = day.format('YYYY-MM-DD');
          const uploads = uploadsByDay.get(key) ?? 0;
          const logins = loginsByDay.get(key) ?? 0;

          totalUploads += uploads;
          totalLogins += logins;

          series.push({
            date: day.toISOString(),
            uploads,
            logins,
          });
        }

        return res.send({
          days,
          series,
          totals: {
            uploads: totalUploads,
            logins: totalLogins,
          },
        });
      },
    );
  },
  { name: PATH },
);
