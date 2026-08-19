import { ApiError } from '@/lib/api/errors';
import { files as fileTable } from '@/lib/db/schema';
import { File, formatFiles, countFiles, fileOrderBy, fileSchema, listFiles } from '@/lib/db/models/file';
import { getFolderWithOwner } from '@/lib/db/models/folder';
import { listIncompleteFiles } from '@/lib/db/models/incompleteFile';
import { getCommonFileIds } from '@/lib/db/models/tag';
import { getUserIdentity } from '@/lib/db/models/user';
import { canInteract, canManage } from '@/lib/role';
import { paginationQs } from '@/lib/validation';
import { userMiddleware } from '@/server/middleware/user';
import typedPlugin from '@/server/typedPlugin';
import z from 'zod';
import { and, eq, ilike, inArray, notInArray, or, sql, type SQL } from 'drizzle-orm';

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
          if (!canManage(req.user, f.User)) throw new ApiError(9002);

          folderId = f.id;
        }

        const incompleteFiles = await listIncompleteFiles(user.id, { excludeComplete: true });
        const incompleteIds = incompleteFiles.map((file) => file.metadata.file.id);

        const sharedConditions: SQL[] = [eq(fileTable.userId, user.id)];
        if (filter === 'dashboard') {
          sharedConditions.push(
            or(
              sql`${fileTable.type} LIKE 'image/%'`,
              sql`${fileTable.type} LIKE 'video/%'`,
              sql`${fileTable.type} LIKE 'audio/%'`,
              sql`${fileTable.type} LIKE 'text/%'`,
            )!,
          );
        }
        if (favorite && filter !== 'all') sharedConditions.push(eq(fileTable.favorite, true));
        if (folderId) sharedConditions.push(eq(fileTable.folderId, folderId));
        if (incompleteIds.length) sharedConditions.push(notInArray(fileTable.id, incompleteIds));

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

          const searchColumn = {
            id: fileTable.id,
            name: fileTable.name,
            originalName: fileTable.originalName,
            type: fileTable.type,
          }[searchField === 'tags' ? 'id' : searchField];
          sharedConditions.push(
            searchField === 'tags'
              ? tagFiles.length
                ? inArray(fileTable.id, tagFiles)
                : sql`false`
              : ilike(searchColumn, `%${searchQuery}%`),
          );

          const similarityResult = await listFiles({
            password: false,
            where: and(...sharedConditions),
            orderBy: fileOrderBy(sortBy, order),
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

        const where = and(...sharedConditions);
        const count = await countFiles(where);

        const files = formatFiles(
          await listFiles({
            where,
            orderBy: fileOrderBy(sortBy, order),
            offset: (Number(page) - 1) * perpage,
            limit: perpage,
          }),
        );

        return res.send({
          page: files,
          total: count,
          pages: Math.ceil(count / perpage),
        });
      },
    );
  },
  { name: PATH },
);
