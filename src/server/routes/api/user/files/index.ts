import { ApiError } from '@/lib/api/errors';
import { db } from '@/lib/db';
import { File, fileSchema, formatFiles, listFiles } from '@/lib/db/models/file';
import { getFolderWithOwner } from '@/lib/db/models/folder';
import { incompleteFileSchema } from '@/lib/db/models/incompleteFile';
import { getCommonFileIds } from '@/lib/db/models/tag';
import { getUserIdentity } from '@/lib/db/models/user';
import { files as fileTable, incompleteFiles as incompleteFileTable } from '@/lib/db/schema';
import { containsText } from '@/lib/db/utils';
import { canInteract, canManage } from '@/lib/role';
import { paginationQs } from '@/lib/validation';
import { userMiddleware } from '@/server/middleware/user';
import typedPlugin from '@/server/typedPlugin';
import { and, eq, inArray, like, ne, notInArray, or, sql, type SQL } from 'drizzle-orm';
import z from 'zod';

export type FileSearchField = 'name' | 'originalName' | 'type' | 'tags' | 'id';

export type ApiUserFilesResponse = {
  page: File[];
  search?: {
    field: FileSearchField;
    query: string | string[];
  };
  total?: number;
  pages?: number;
};

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
            searchField: z.enum(['name', 'originalName', 'type', 'tags', 'id']).optional().default('name'),
            searchQuery: z.string().optional(),
            id: z.string().optional(),
            folder: z.string().optional(),
          }),
          response: {
            200: z.object({
              page: z.array(fileSchema),
              search: z
                .object({
                  field: z.enum(['name', 'originalName', 'type', 'tags', 'id']),
                  query: z.union([z.string(), z.array(z.string())]),
                })
                .optional(),
              total: z.number().optional(),
              pages: z.number().optional(),
            }),
          },
          tags: ['auth'],
        },
        preHandler: [userMiddleware],
      },
      async (req, res) => {
        const user = await getUserIdentity(req.query.id ?? req.user.id);

        if (user && user.id !== req.user.id && !canInteract(req.user.role, user.role))
          throw new ApiError(9002);
        if (!user) throw new ApiError(9002);

        const { perpage, searchQuery, searchField, page, filter, favorite, sortBy, order, folder } =
          req.query;

        let folderId: string | null = null;
        if (folder) {
          const f = await getFolderWithOwner(folder);
          if (!f) throw new ApiError(9002);
          if (!canManage(req.user, f.user)) throw new ApiError(9002);

          folderId = f.id;
        }

        const incompleteFiles = incompleteFileSchema
          .pick({ metadata: true })
          .array()
          .parse(
            await db
              .select({ metadata: incompleteFileTable.metadata })
              .from(incompleteFileTable)
              .where(
                and(eq(incompleteFileTable.userId, user.id), ne(incompleteFileTable.status, 'COMPLETE')),
              ),
          );
        const incompleteIds = incompleteFiles.map((file) => file.metadata.file.id);

        const sharedConditions = (file: typeof fileTable) => {
          const conditions: SQL[] = [eq(file.userId, user.id)];
          if (filter === 'dashboard') {
            conditions.push(
              or(
                like(file.type, 'image/%'),
                like(file.type, 'video/%'),
                like(file.type, 'audio/%'),
                like(file.type, 'text/%'),
              )!,
            );
          }
          if (favorite && filter !== 'all') conditions.push(eq(file.favorite, true));
          if (folderId) conditions.push(eq(file.folderId, folderId));
          if (incompleteIds.length) conditions.push(notInArray(file.id, incompleteIds));
          return conditions;
        };

        if (searchQuery) {
          let tagFiles: string[] = [];

          if (searchField === 'tags') {
            const parsedTags = searchQuery
              .split(',')
              .map((tag) => tag.trim())
              .filter((tag) => tag);

            const commonIds = await getCommonFileIds(parsedTags, user.id);
            if (commonIds === null) throw new ApiError(1032);
            tagFiles = commonIds;
          }

          const searchConditions = (file: typeof fileTable) => {
            const conditions = sharedConditions(file);
            const searchColumn = {
              id: file.id,
              name: file.name,
              originalName: file.originalName,
              type: file.type,
            }[searchField === 'tags' ? 'id' : searchField];
            conditions.push(
              searchField === 'tags'
                ? tagFiles.length
                  ? inArray(file.id, tagFiles)
                  : sql`false`
                : containsText(searchColumn, searchQuery),
            );
            return and(...conditions)!;
          };

          const similarityResult = await listFiles({
            password: false,
            where: { RAW: (file) => searchConditions(file) },
            orderBy: (file, { asc, desc }) => (order === 'asc' ? asc(file[sortBy]) : desc(file[sortBy])),
            offset: (Number(page) - 1) * perpage,
            limit: perpage,
          });

          return res.send({
            page: formatFiles(similarityResult),
            search: {
              field: searchField,
              query:
                searchField === 'tags'
                  ? searchQuery
                      .split(',')
                      .map((tag) => tag.trim())
                      .filter((tag) => tag)
                  : searchQuery,
            },
          });
        }

        const where = and(...sharedConditions(fileTable));
        const total = await db.$count(fileTable, where);

        const files = formatFiles(
          await listFiles({
            password: true,
            where: { RAW: (file) => and(...sharedConditions(file))! },
            orderBy: (file, { asc, desc }) => (order === 'asc' ? asc(file[sortBy]) : desc(file[sortBy])),
            offset: (Number(page) - 1) * perpage,
            limit: perpage,
          }),
        );

        return res.send({
          page: files,
          total,
          pages: Math.ceil(total / perpage),
        });
      },
    );
  },
  { name: PATH },
);
