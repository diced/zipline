import { ApiError } from '@/lib/api/errors';
import { config } from '@/lib/config';
import { log } from '@/lib/logger';
import { isAdministrator } from '@/lib/role';
import { checkForUpdates, getVersion, VersionInfo, versionInfoSchema } from '@/lib/version';
import { userMiddleware } from '@/server/middleware/user';
import typedPlugin from '@/server/typedPlugin';
import z from 'zod';

export type ApiVersionResponse = {
  details: ReturnType<typeof getVersion>;
  data: VersionInfo;
  cached: boolean;
};

const logger = log('api').c('version');

export const PATH = '/api/version';
export default typedPlugin(
  async (server) => {
    server.get(
      PATH,
      {
        schema: {
          description:
            'Return version information, including current build details and upstream/latest version metadata.',
          response: {
            200: z.object({
              data: versionInfoSchema.describe('version and update information'),
              details: z.object({
                version: z.string(),
                sha: z.string().nullable(),
              }),
              cached: z.boolean(),
            }),
          },
          tags: ['auth'],
        },
        preHandler: [userMiddleware],
      },
      async (req, res) => {
        if (!config.features.versionChecking && !isAdministrator(req.user.role)) throw new ApiError(9002);

        const details = getVersion();

        try {
          const { data, cached } = await checkForUpdates(details);

          return res.send({
            data,
            details,
            cached,
          });
        } catch (e) {
          logger.error('failed to check for updates').error(e as Error);
          throw new ApiError(6001);
        }
      },
    );
  },
  { name: PATH },
);
