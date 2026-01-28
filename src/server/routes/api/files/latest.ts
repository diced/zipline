import { prisma } from '@/lib/db';
import { File, cleanFiles, fileSelect } from '@/lib/db/models/file';
import typedPlugin from '@/server/typedPlugin';

export type ApiFilesLatestResponse = File | null;

export const PATH = '/api/files/latest';

export default typedPlugin(
  async (server) => {
    server.get(PATH, async (req, res) => {
      const files = cleanFiles(
        await prisma.file.findMany({
          where: {
            password: null,
          },
          select: fileSelect,
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
        }),
      );

      if (files.length === 0) {
        return res.send(null);
      }

      return res.send(files[0]);
    });
  },
  { name: PATH },
);
