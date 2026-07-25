import { ApiError } from '@/lib/api/errors';
import { config } from '@/lib/config';
import { hashPassword } from '@/lib/crypto';
import { prisma } from '@/lib/db';
import { log } from '@/lib/logger';
import { canInteract } from '@/lib/role';
import { randomCharacters } from '@/lib/random';
import { formatRootUrl } from '@/lib/url';
import { userMiddleware } from '@/server/middleware/user';
import typedPlugin from '@/server/typedPlugin';
import z from 'zod';

export type ApiUserFilesIdShareResponse = {
  share: {
    id: string;
    token: string;
    expiresAt: string | null;
    maxViews: number | null;
    views: number;
    createdAt: string;
  };
  url: string;
};

const logger = log('api').c('user').c('files').c('[id]').c('share');

export const PATH = '/api/user/files/:id/share';
export default typedPlugin(
  async (server) => {
    server.get(
      PATH,
      {
        schema: {
          description: 'List active share links for a file owned by the authenticated user.',
          params: z.object({ id: z.string() }),
          response: {
            200: z.object({
              shares: z.array(
                z.object({
                  id: z.string(),
                  token: z.string(),
                  expiresAt: z.union([z.date(), z.string()]).nullable(),
                  maxViews: z.number().nullable(),
                  views: z.number(),
                  createdAt: z.union([z.date(), z.string()]),
                }),
              ),
            }),
          },
          tags: ['auth'],
        },
        preHandler: [userMiddleware],
      },
      async (req, res) => {
        const file = await prisma.file.findFirst({
          where: { OR: [{ id: req.params.id }, { name: req.params.id }] },
          include: { User: true },
        });
        if (!file) throw new ApiError(4000);
        if (file.userId !== req.user.id && !canInteract(req.user.role, file.User?.role ?? 'USER'))
          throw new ApiError(4000);

        const shares = await prisma.fileShare.findMany({
          where: { fileId: file.id },
          orderBy: { createdAt: 'desc' },
          omit: { password: true },
        });

        return res.send({ shares });
      },
    );

    server.post(
      PATH,
      {
        schema: {
          description: 'Create a share link for a file owned by the authenticated user.',
          params: z.object({ id: z.string() }),
          body: z
            .object({
              expiresAt: z.union([z.date(), z.string()]).nullable().optional(),
              maxViews: z.number().min(1).nullable().optional(),
              password: z.string().min(1).nullable().optional(),
            })
            .optional(),
          response: {
            200: z.object({
              share: z.object({
                id: z.string(),
                token: z.string(),
                expiresAt: z.union([z.date(), z.string()]).nullable(),
                maxViews: z.number().nullable(),
                views: z.number(),
                createdAt: z.union([z.date(), z.string()]),
              }),
              url: z.string(),
            }),
          },
          tags: ['auth'],
        },
        preHandler: [userMiddleware],
      },
      async (req, res) => {
        const file = await prisma.file.findFirst({
          where: { OR: [{ id: req.params.id }, { name: req.params.id }] },
          include: { User: true },
        });
        if (!file) throw new ApiError(4000);
        if (file.userId !== req.user.id && !canInteract(req.user.role, file.User?.role ?? 'USER'))
          throw new ApiError(4000);

        const { expiresAt, maxViews, password } = req.body ?? {};

        let token: string;
        let existing: { id: string } | null;
        do {
          token = randomCharacters(24);
          existing = await prisma.fileShare.findFirst({ where: { token } });
        } while (existing);

        const parsedExpiresAt =
          expiresAt === undefined || expiresAt === null ? undefined : new Date(expiresAt);

        const share = await prisma.fileShare.create({
          data: {
            token,
            fileId: file.id,
            ...(parsedExpiresAt && { expiresAt: parsedExpiresAt }),
            ...(maxViews !== undefined && { maxViews }),
            ...(password && { password: await hashPassword(password) }),
          },
          omit: { password: true },
        });

        const host = `${config.core.returnHttpsUrls ? 'https' : 'http'}://${req.headers.host ?? 'localhost'}`;
        const url = `${host}${formatRootUrl(config.files.route, file.name)}?share=${encodeURIComponent(token)}`;

        logger.info(`${req.user.username} created share for file ${file.name}`, {
          file: file.id,
          share: share.id,
        });

        return res.send({ share, url });
      },
    );
  },
  { name: PATH },
);
