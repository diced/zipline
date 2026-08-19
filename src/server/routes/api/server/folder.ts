import { ApiError } from '@/lib/api/errors';
import { files as fileTable } from '@/lib/db/schema';
import { File, cleanFiles, countFiles, fileOrderBy, fileSchema, listFiles } from '@/lib/db/models/file';
import {
  buildPublicParentChain,
  cleanFolder,
  Folder,
  getPublicFolderDetails,
  publicFolderSchema,
} from '@/lib/db/models/folder';
import { paginationQs } from '@/lib/validation';
import typedPlugin from '@/server/typedPlugin';
import z from 'zod';
import { eq } from 'drizzle-orm';

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
              folder: publicFolderSchema.partial(),
              page: z.array(fileSchema),
              total: z.number(),
              pages: z.number(),
            }),
          },
        },
      },
      async (req, res) => {
        const { id } = req.params;

        const folder = await getPublicFolderDetails(id);

        if (!folder) throw new ApiError(9002);
        if (!folder.public && !folder.allowUploads) throw new ApiError(9002);

        const { page, perpage, sortBy, order } = req.query;
        if ((!page && folder.allowUploads) || !folder.public) {
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

        const where = eq(fileTable.folderId, folder.id);
        const total = await countFiles(where);
        const pages = total === 0 ? 0 : Math.ceil(total / perpage);

        const files = cleanFiles(
          await listFiles({
            where,
            orderBy: fileOrderBy(sortBy, order),
            offset: (Number(page) - 1) * perpage,
            limit: perpage,
            tags: false,
          }),
          true,
        );

        if (folder.parentId) {
          folder.parent = await buildPublicParentChain(folder.parentId);
        }

        const cleanedFolder = publicFolderSchema.parse(cleanFolder(folder, true));

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
