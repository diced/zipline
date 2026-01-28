import { parseRange } from '@/lib/api/range';
import { config } from '@/lib/config';
import { verifyPassword } from '@/lib/crypto';
import { datasource } from '@/lib/datasource';
import { prisma } from '@/lib/db';
import { sanitizeFilename } from '@/lib/fs';
import { log } from '@/lib/logger';
import { canInteract } from '@/lib/role';
import { userMiddleware } from '@/server/middleware/user';
import typedPlugin from '@/server/typedPlugin';
import z from 'zod';

import { getFilePath } from '@/lib/datasource/helpers';

const logger = log('routes').c('raw');

export const PATH = '/api/user/files/:id/raw';
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
            pw: z.string().optional(),
            download: z.string().optional(),
          }),
        },
        preHandler: [userMiddleware],
      },
      async (req, res) => {
        const { pw, download } = req.query;

        const id = sanitizeFilename(req.params.id);
        if (!id) return res.callNotFound();

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

          if (!thumbnail) return res.callNotFound();
          if (thumbnail.file && thumbnail.file.userId !== req.user.id) {
            if (!canInteract(req.user.role, thumbnail.file.User?.role)) return res.callNotFound();
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
          if (!canInteract(req.user.role, file.User?.role)) return res.callNotFound();
        }

        if (file?.deletesAt && file.deletesAt <= new Date()) {
          try {
            const filePath = getFilePath({ userId: file.userId, type: file.type, name: file.name });
            await datasource.delete(filePath);
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

          return res.callNotFound();
        }

        if (file?.maxViews && file.views >= file.maxViews) {
          if (!config.features.deleteOnMaxViews) return res.callNotFound();

          try {
            const filePath = getFilePath({ userId: file.userId, type: file.type, name: file.name });
            await datasource.delete(filePath);
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

          return res.callNotFound();
        }

        if (file?.password) {
          if (!pw) return res.forbidden('Password protected.');
          const verified = await verifyPassword(pw, file.password!);

          if (!verified) return res.forbidden('Incorrect password.');
        }

        const filePath = getFilePath({
          userId: file ? file.userId : req.user.id,
          type: file ? file.type : 'application/octet-stream', // fallback, likely wont happen if file found
          name: file ? file.name : id,
        });

        // If file not found in DB, we constructed path with potentially wrong info.
        // But logic above: `const file = ... await findFirst`.
        // If !file (lines 58-65), we might continue?
        // Wait, lines 58-65 finds file. There is NO check `if (!file) return res.callNotFound()`.
        // However, standard logic implies we should handle it.
        // The original code used `file?.name ?? id`.
        // If file is null, we can't really guess the path `userId/type/name` correctly.
        // Actually, if !file, we probably should 404. But strictly keeping to replace logic:

        let lookPath = '';
        if (file) {
          lookPath = getFilePath({ userId: file.userId, type: file.type, name: file.name });
        } else {
          // Fallback for weird edge case if generic ID passed? Unlikely to work with new structure.
          // We'll proceed assuming file exists or let datasource fail.
          // Actually, without file metadata we CANNOT find the file in the new structure (recursive search too expensive).
          return res.callNotFound();
        }

        const size = file?.size || (await datasource.size(lookPath));

        if (req.headers.range) {
          const [start, end] = parseRange(req.headers.range, size);
          if (start >= size || end >= size) {
            const buf = await datasource.get(lookPath);
            if (!buf) return res.callNotFound();

            return res
              .type(file?.type || 'application/octet-stream')
              .headers({
                'Content-Length': size,
                ...(file?.originalName
                  ? {
                      'Content-Disposition': `${download ? 'attachment; ' : ''}filename="${encodeURIComponent(file.originalName)}"`,
                    }
                  : download && {
                      'Content-Disposition': 'attachment;',
                    }),
              })
              .status(416)
              .send(buf);
          }

          const buf = await datasource.range(lookPath, start || 0, end);
          if (!buf) return res.callNotFound();

          return res
            .type(file?.type || 'application/octet-stream')
            .headers({
              'Content-Range': `bytes ${start}-${end}/${size}`,
              'Accept-Ranges': 'bytes',
              'Content-Length': end - start + 1,
              ...(file?.originalName
                ? {
                    'Content-Disposition': `${download ? 'attachment; ' : ''}filename="${encodeURIComponent(file.originalName)}"`,
                  }
                : download && {
                    'Content-Disposition': 'attachment;',
                  }),
            })
            .status(206)
            .send(buf);
        }

        const buf = await datasource.get(lookPath);
        if (!buf) return res.callNotFound();

        return res
          .type(file?.type || 'application/octet-stream')
          .headers({
            'Content-Length': size,
            'Accept-Ranges': 'bytes',
            ...(file?.originalName
              ? {
                  'Content-Disposition': `${download ? 'attachment; ' : ''}filename="${encodeURIComponent(file.originalName)}"`,
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
