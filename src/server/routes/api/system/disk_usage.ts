import { config } from '@/lib/config';
import { administratorMiddleware } from '@/server/middleware/administrator';
import { userMiddleware } from '@/server/middleware/user';
import typedPlugin from '@/server/typedPlugin';
import { statfs } from 'node:fs/promises';

export type ApiSystemDiskUsageResponse = {
  availableBytes: number;
  totalBytes: number;
  usedPercentage: number;
};

export const PATH = '/api/system/disk-usage';

export default typedPlugin(
  async (server) => {
    server.get(PATH, { preHandler: [userMiddleware, administratorMiddleware] }, async (req, res) => {
      const datasourceDir = config.datasource.local.directory;

      if (!datasourceDir) {
        return res.internalServerError('DATASOURCE_LOCAL_DIRECTORY not configured');
      }

      try {
        const stats = await statfs(datasourceDir);

        const totalBytes = stats.blocks * stats.bsize;
        const availableBytes = stats.bavail * stats.bsize;
        const usedBytes = totalBytes - availableBytes;
        const usedPercentage = (usedBytes / totalBytes) * 100;

        return res.send({
          availableBytes,
          totalBytes,
          usedPercentage,
        });
      } catch (error) {
        server.log.error(error, 'Failed to get disk usage statistics');
        return res.internalServerError('Failed to get disk usage statistics');
      }
    });
  },
  { name: PATH },
);
