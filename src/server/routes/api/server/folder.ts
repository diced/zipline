import { ApiError } from '@/lib/api/errors';
import { prisma } from '@/lib/db';
import { File, cleanFiles, fileSchema, fileSelect } from '@/lib/db/models/file';
import { buildPublicParentChain, cleanFolder, Folder, folderSchema } from '@/lib/db/models/folder';
import { paginationQs } from '@/lib/validation';
import typedPlugin from '@/server/typedPlugin';
import z from 'zod';

export type ApiServerFolderResponse = {
  folder: Partial<Folder>;
  page: File[];
  total: number;
  pages: number;
};

export const PATH = '/api/server/folder/:id';
export default typedPlugin(
  async (server) => {
    server.get(
      PATH,
      {
        schema: {
          description: 'Fetch a folder by ID/name. Behavior varies based on public and allowUploads flags.',
          params: z.object({
            id: z.string(),
          }),
          querystring: paginationQs
            .pick({
              page: true,
              perpage: true,
              sortBy: true,
              order: true,
            })
            .partial({ page: true }),
          response: {
            200: z.object({
              folder: folderSchema.partial(),
              page: z.array(fileSchema),
              total: z.number(),
              pages: z.number(),
            }),
          },
        },
      },
      async (req, res) => {
        const { id } = req.params;

        const folder = await prisma.folder.findFirst({
          where: {
            OR: [{ id }, { name: id }],
          },
          include: {
            children: {
              where: { public: true },
              orderBy: { createdAt: 'desc' },
              select: {
                id: true,
                name: true,
                createdAt: true,
                updatedAt: true,
                public: true,
                _count: { select: { children: true, files: true } },
              },
            },
            parent: {
              select: { id: true, name: true, public: true, parentId: true },
            },
          },
        });

        if (!folder) throw new ApiError(9002);
        if (!folder.public && !folder.allowUploads) throw new ApiError(9002);

        const { page, perpage, sortBy, order } = req.query;
        if (!page && folder.allowUploads) {
          return res.send({
            folder: {
              id: folder.id,
              name: folder.name,
              allowUploads: folder.allowUploads,
              public: folder.public,
            },
            page: [],
            total: 0,
            pages: 0,
          });
        }

        const where = { folderId: folder.id };
        const total = await prisma.file.count({ where });
        const pages = total === 0 ? 0 : Math.ceil(total / perpage);

        const files = cleanFiles(
          await prisma.file.findMany({
            where,
            select: { ...fileSelect, password: true, tags: false },
            orderBy: {
              [sortBy]: order,
            },
            skip: (Number(page) - 1) * perpage,
            take: perpage,
          }),
          true,
        );

        if (folder.parentId) {
          folder.parent = await buildPublicParentChain(folder.parentId);
        }

        const cleanedFolder = cleanFolder(folder, true);

        return res.send({
          folder: cleanedFolder,
          page: files,
          total,
          pages,
        });
      },
    );
  },
  { name: PATH },
);
