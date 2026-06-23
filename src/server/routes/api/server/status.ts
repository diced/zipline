import { config } from '@/lib/config';
import { diskStatus, diskStatusSchema } from '@/lib/disk';
import { administratorMiddleware } from '@/server/middleware/administrator';
import { userMiddleware } from '@/server/middleware/user';
import typedPlugin from '@/server/typedPlugin';
import z from 'zod';

export const apiServerStatusResponseSchema = z.object({
  datasource: z.enum(['local', 's3']).describe('Configured datasource type for this Zipline instance.'),
  storage: diskStatusSchema,
});

export type ApiServerStatusResponse = z.infer<typeof apiServerStatusResponseSchema>;

export const PATH = '/api/server/status';
export default typedPlugin(
  async (server) => {
    server.get(
      PATH,
      {
        schema: {
          description: 'Get disk status for the configured datasource',
          response: {
            200: apiServerStatusResponseSchema,
          },
          tags: ['auth', 'admin'],
        },
        preHandler: [userMiddleware, administratorMiddleware],
      },
      async (_, res) => {
        const status = await diskStatus();

        return res.send({
          datasource: config.datasource.type,
          storage: status,
        });
      },
    );
  },
  { name: PATH },
);
