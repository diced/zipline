import { ApiError } from '@/lib/api/errors';
import { parseRange } from '@/lib/api/range';
import { config } from '@/lib/config';
import { verifyPassword } from '@/lib/crypto';
import { datasource } from '@/lib/datasource';
import { prisma } from '@/lib/db';
import { sanitizeFilename } from '@/lib/fs';
import { log } from '@/lib/logger';
import { canInteract } from '@/lib/role';
import { zQsBoolean } from '@/lib/validation';
import { userMiddleware } from '@/server/middleware/user';
import typedPlugin from '@/server/typedPlugin';
import z from 'zod';

const logger = log('routes').c('raw');

export const PATH = '/api/user/files/:id/raw';
export default typedPlugin(
  async (server) => {
    server.get(
      PATH,
      {
        schema: {
          description:
            'Stream a file or thumbnail owned by the authenticated user by ID, with optional password and download handling.',
          params: z.object({
            id: z.string(),
          }),
          querystring: z.object({
            pw: z.string().optional(),
            download: zQsBoolean.optional(),
          }),
        },
        preHandler: [userMiddleware],
      },
      async (req, res) => {
        const { pw, download } = req.query;

        const id = sanitizeFilename(req.params.id);
        if (!id) throw new ApiError(9002);

        if (id.startsWith('.thumbnail')) {
          const thumbnail = await prisma.thumbnail.findFirst({
            where: {
              path: id,
            },
            include: {
              file: {
                include: {
                  User: true,
                },
              },
            },
          });

          if (!thumbnail) throw new ApiError(9002);
          if (thumbnail.file && thumbnail.file.userId !== req.user.id) {
            if (!canInteract(req.user.role, thumbnail.file.User?.role)) throw new ApiError(9002);
          }
        }

        const file = await prisma.file.findFirst({
          where: {
            id,
          },
          include: {
            User: true,
          },
        });

        if (file && file.userId !== req.user.id) {
          if (!canInteract(req.user.role, file.User?.role)) throw new ApiError(9002);
        }

        if (file?.deletesAt && file.deletesAt <= new Date()) {
          try {
            await datasource.delete(file.name);
            await prisma.file.delete({
              where: {
                id: file.id,
              },
            });
          } catch (e) {
            logger
              .error('failed to delete file on expiration', {
                id: file.id,
              })
              .error(e as Error);
          }

          throw new ApiError(9002);
        }

        if (file?.maxViews && file.views >= file.maxViews) {
          if (!config.features.deleteOnMaxViews) throw new ApiError(9002);

          try {
            await datasource.delete(file.name);
            await prisma.file.delete({
              where: {
                id: file.id,
              },
            });
          } catch (e) {
            logger
              .error('failed to delete file on max views', {
                id: file.id,
              })
              .error(e as Error);
          }

          throw new ApiError(9002);
        }

        if (file?.password) {
          if (!pw) throw new ApiError(3004);
          const verified = await verifyPassword(pw, file.password!);
          if (!verified) throw new ApiError(3005);
        }

        const size = file?.size || (await datasource.size(file?.name ?? id));
        const fileType = file?.type || 'application/octet-stream';
        const contentType = fileType.startsWith('text/') ? `${fileType}; charset=utf-8` : fileType;

        if (req.headers.range) {
          const [start, end] = parseRange(req.headers.range, size);
          if (start >= size || end >= size) {
            const buf = await datasource.get(file?.name ?? id);
            if (!buf) throw new ApiError(9002);

            return res
              .type(contentType)
              .headers({
                'Content-Length': size,
                ...(file?.originalName
                  ? {
                      'Content-Disposition': `${download ? 'attachment; ' : ''}filename*=utf-8''${encodeURIComponent(file.originalName)}`,
                    }
                  : download && {
                      'Content-Disposition': 'attachment;',
                    }),
              })
              .status(416)
              .send(buf);
          }

          const buf = await datasource.range(file?.name ?? id, start || 0, end);
          if (!buf) throw new ApiError(9002);

          return res
            .type(contentType)
            .headers({
              'Content-Range': `bytes ${start}-${end}/${size}`,
              'Accept-Ranges': 'bytes',
              'Content-Length': end - start + 1,
              ...(file?.originalName
                ? {
                    'Content-Disposition': `${download ? 'attachment; ' : ''}filename*=utf-8''${encodeURIComponent(file.originalName)}`,
                  }
                : download && {
                    'Content-Disposition': 'attachment;',
                  }),
            })
            .status(206)
            .send(buf);
        }

        const buf = await datasource.get(file?.name ?? id);
        if (!buf) throw new ApiError(9002);

        return res
          .type(contentType)
          .headers({
            'Content-Length': size,
            'Accept-Ranges': 'bytes',
            ...(file?.originalName
              ? {
                  'Content-Disposition': `${download ? 'attachment; ' : ''}filename*=utf-8''${encodeURIComponent(file.originalName)}`,
                }
              : download && {
                  'Content-Disposition': 'attachment;',
                }),
          })
          .status(200)
          .send(buf);
      },
    );
  },
  { name: PATH },
);
