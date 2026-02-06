import { prisma } from '@/lib/db';
import { fileSelect } from '@/lib/db/models/file';
import { buildPublicParentChain, cleanFolder, Folder } from '@/lib/db/models/folder';
import typedPlugin from '@/server/typedPlugin';
import z from 'zod';

export type ApiServerFolderResponse = Partial<Folder>;

export const PATH = '/api/server/folder/:id';
export default typedPlugin(
  async (server) => {
    server.get(
      PATH,
      {
        schema: {
          params: z.object({
            id: z.string(),
          }),
          querystring: z.object({
            uploads: z.string().optional(),
          }),
        },
      },
      async (req, res) => {
        const { id } = req.params;
        const { uploads } = req.query;

        const folder = await prisma.folder.findUnique({
          where: {
            id: id,
          },
          include: {
            files: {
              select: {
                ...fileSelect,
                password: true,
                tags: false,
              },
              orderBy: {
                createdAt: 'desc',
              },
            },
            children: {
              where: { public: true },
              orderBy: { createdAt: 'desc' },
              select: {
                id: true,
                name: true,
                createdAt: true,
                updatedAt: true,
                public: true,
                _count: {
                  select: { children: true, files: true },
                },
              },
            },
            parent: {
              select: { id: true, name: true, public: true, parentId: true },
            },
          },
        });

        if (!folder) return res.notFound();

        if ((uploads && !folder.allowUploads) || (!uploads && !folder.public)) return res.notFound();

        if (folder.parentId) {
          (folder as any).parent = await buildPublicParentChain(folder.parentId);
        }

        return res.send(cleanFolder(folder, true));
      },
    );
  },
  { name: PATH },
);
