import { ApiError } from '@/lib/api/errors';
import { db } from '@/lib/db';
import { fileColumns, filePasswordExtra, fileRelations, fileSchema, formatFiles } from '@/lib/db/models/file';
import { getFolderWithOwner } from '@/lib/db/models/folder';
import { getUserIdentity } from '@/lib/db/models/user';
import { files, incompleteFiles, tags } from '@/lib/db/schema';
import { containsText } from '@/lib/db/utils';
import { canInteract, canManage } from '@/lib/role';
import { paginationQs } from '@/lib/validation';
import { userMiddleware } from '@/server/middleware/user';
import typedPlugin from '@/server/typedPlugin';
import { and, eq, inArray, like, ne, notInArray, or, sql } from 'drizzle-orm';
import z from 'zod';

const searchFieldSchema = z.enum(['name', 'originalName', 'type', 'tags', 'id']);
const responseSchema = z.object({
  page: z.array(fileSchema),
  search: z
    .object({
      field: searchFieldSchema,
      query: z.union([z.string(), z.array(z.string())]),
    })
    .optional(),
  total: z.number().optional(),
  pages: z.number().optional(),
});

export type FileSearchField = z.infer<typeof searchFieldSchema>;
export type ApiUserFilesResponse = z.infer<typeof responseSchema>;

export const PATH = '/api/user/files';
export default typedPlugin(
  async (server) => {
    server.get(
      PATH,
      {
        schema: {
          description:
            'List, filter, and search files for the authenticated user (or another user if permitted).',
          querystring: paginationQs.extend({
            searchField: searchFieldSchema.optional().default('name'),
            searchQuery: z.string().optional(),
            id: z.string().optional(),
            folder: z.string().optional(),
          }),
          response: {
            200: responseSchema,
          },
          tags: ['auth'],
        },
        preHandler: [userMiddleware],
      },
      async (req, res) => {
        const user = await getUserIdentity(req.query.id ?? req.user.id);

        if (!user || (user.id !== req.user.id && !canInteract(req.user.role, user.role)))
          throw new ApiError(9002);

        const { perpage, searchQuery, searchField, page, filter, favorite, sortBy, order, folder } =
          req.query;

        let folderId: string | undefined;
        if (folder) {
          const targetFolder = await getFolderWithOwner(folder);
          if (!targetFolder || !canManage(req.user, targetFolder.user)) throw new ApiError(9002);

          folderId = targetFolder.id;
        }

        const incompleteIds = db
          .select({ id: sql<string>`${incompleteFiles.metadata}->'file'->>'id'` })
          .from(incompleteFiles)
          .where(and(eq(incompleteFiles.userId, user.id), ne(incompleteFiles.status, 'COMPLETE')));

        let tagIds: string[] = [];
        if (searchQuery && searchField === 'tags') {
          tagIds = searchQuery
            .split(',')
            .map((tag) => tag.trim())
            .filter((tag) => tag);

          if (!tagIds.length) return res.send({ page: [], search: { field: searchField, query: tagIds } });

          const ownedTagCount = await db.$count(
            tags,
            and(eq(tags.userId, user.id), inArray(tags.id, tagIds)),
          );
          if (ownedTagCount !== tagIds.length) throw new ApiError(1032);
        }

        const fileFilter = (file: typeof files) =>
          and(
            eq(file.userId, user.id),
            filter === 'dashboard'
              ? or(
                  like(file.type, 'image/%'),
                  like(file.type, 'video/%'),
                  like(file.type, 'audio/%'),
                  like(file.type, 'text/%'),
                )
              : undefined,
            favorite && filter !== 'all' ? eq(file.favorite, true) : undefined,
            folderId ? eq(file.folderId, folderId) : undefined,
            notInArray(file.id, incompleteIds),
            searchQuery && searchField !== 'tags' ? containsText(file[searchField], searchQuery) : undefined,
          )!;

        const fileRows = await db.query.files.findMany({
          columns: fileColumns,
          extras: searchQuery ? undefined : filePasswordExtra,
          where: {
            RAW: fileFilter,
            AND: tagIds.map((id) => ({ tags: { id } })),
          },
          orderBy: (file, { asc, desc }) => (order === 'asc' ? asc(file[sortBy]) : desc(file[sortBy])),
          offset: (page - 1) * perpage,
          limit: perpage,
          with: fileRelations,
        });
        const filePage = formatFiles(fileRows);

        if (searchQuery)
          return res.send({
            page: filePage,
            search: {
              field: searchField,
              query: searchField === 'tags' ? tagIds : searchQuery,
            },
          });

        const total = await db.$count(files, fileFilter(files));

        return res.send({
          page: filePage,
          total,
          pages: Math.ceil(total / perpage),
        });
      },
    );
  },
  { name: PATH },
);
