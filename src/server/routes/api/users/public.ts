import { ApiError } from '@/lib/api/errors';
import { prisma } from '@/lib/db';
import { cleanFiles } from '@/lib/db/models/file';
import typedPlugin from '@/server/typedPlugin';
import z from 'zod';

const paramsSchema = z.object({
  username: z.string(),
});

export const PATH = '/api/users/:username/public';

export default typedPlugin(
  async (server) => {
    server.get(
      PATH,
      {
        schema: {
          description: 'Fetch public profile and gallery files for a user.',
          params: paramsSchema,
          response: {
            200: z.object({
              user: z.object({
                username: z.string(),
                avatar: z.string().nullable(),
                banner: z.string().nullable().optional(),
                bio: z.string().nullable().optional(),
                createdAt: z.string(),
                stats: z
                  .object({
                    totalViews: z.number().nullable(),
                    totalUploads: z.number().nullable(),
                    privateUploads: z.number().nullable(),
                    publicUploads: z.number().nullable(),
                  })
                  .optional(),
              }),
              files: z.array(
                z.object({
                  id: z.string(),
                  name: z.string(),
                  originalName: z.string().nullable(),
                  type: z.string(),
                  size: z.union([z.number(), z.bigint()]),
                  views: z.number(),
                  createdAt: z.string(),
                  url: z.string().optional(),
                  thumbnail: z
                    .object({
                      path: z.string(),
                    })
                    .nullable()
                    .optional(),
                }),
              ),
            }),
          },
        },
      },
      async (req, res) => {
        const { username } = req.params;

        const user = await prisma.user.findFirst({
          where: {
            username: {
              equals: username,
              mode: 'insensitive',
            },
          },
          select: {
            id: true,
            username: true,
            avatar: true,
            createdAt: true,
            view: true,
          },
        });

        if (!user) throw new ApiError(4000);

        const view = (user.view || {}) as any;
        const hasBanner = !!view.banner;
        const bio = view.bio || null;

        const showTotalViews = view.publicShowTotalViews !== false;
        const showTotalUploads = view.publicShowTotalUploads !== false;
        const showPrivateStats = view.publicShowPrivateStats !== false;
        const showPublicStats = view.publicShowPublicStats !== false;

        // Parallelise all queries
        const [files, totalViewsResult, totalUploads, privateUploads, publicUploads] = await Promise.all([
          prisma.file.findMany({
            where: { userId: user.id, public: true },
            orderBy: { createdAt: 'desc' },
            select: {
              id: true,
              name: true,
              originalName: true,
              type: true,
              size: true,
              views: true,
              createdAt: true,
              thumbnail: {
                select: {
                  path: true,
                },
              },
            },
          }),
          showTotalViews
            ? prisma.file.aggregate({ where: { userId: user.id }, _sum: { views: true } })
            : Promise.resolve(null),
          showTotalUploads ? prisma.file.count({ where: { userId: user.id } }) : Promise.resolve(null),
          showPrivateStats
            ? prisma.file.count({ where: { userId: user.id, public: false } })
            : Promise.resolve(null),
          showPublicStats
            ? prisma.file.count({ where: { userId: user.id, public: true } })
            : Promise.resolve(null),
        ]);

        const cleanedFiles = cleanFiles(files as any, true);
        const totalViews = (totalViewsResult as any)?._sum?.views ?? 0;

        return res.send({
          user: {
            username: user.username,
            // Return URL paths instead of raw base64 — browser can cache these
            avatar: user.avatar ? `/api/users/${user.username}/avatar` : null,
            banner: hasBanner ? `/api/users/${user.username}/banner` : null,
            bio,
            createdAt: user.createdAt.toISOString(),
            stats: {
              totalViews: showTotalViews ? Number(totalViews) : null,
              totalUploads,
              privateUploads,
              publicUploads,
            },
          },
          files: cleanedFiles.map((f: any) => ({
            id: f.id,
            name: f.name,
            originalName: f.originalName,
            type: f.type,
            size: Number(f.size),
            views: f.views,
            createdAt: f.createdAt,
            url: f.url,
            thumbnail: f.thumbnail ? { path: f.thumbnail.path } : null,
          })),
        });
      },
    );
  },
  { name: PATH },
);
