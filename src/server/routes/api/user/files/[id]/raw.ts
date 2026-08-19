import { verifyAccessToken } from '@/lib/accessToken';
import { setContentSecurity } from '@/lib/api/contentSecurity';
import { ApiError } from '@/lib/api/errors';
import { parseRange } from '@/lib/api/range';
import { config } from '@/lib/config';
import { datasource } from '@/lib/datasource';
import { removeFile, getFile } from '@/lib/db/models/file';
import { getThumbnailWithOwner } from '@/lib/db/models/thumbnail';
import { sanitizeFilename } from '@/lib/fs';
import { log } from '@/lib/logger';
import { guess } from '@/lib/mimes';
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
            token: z.string().optional(),
            download: zQsBoolean.optional(),
          }),
          tags: ['auth'],
        },
        preHandler: [userMiddleware],
      },
      async (req, res) => {
        const { token, download } = req.query;

        setContentSecurity(res);

        const id = sanitizeFilename(req.params.id);
        if (!id) throw new ApiError(9002);

        if (id.startsWith('.thumbnail')) {
          const thumbnail = await getThumbnailWithOwner(id);

          if (!thumbnail) throw new ApiError(9002);
          if (thumbnail.file && thumbnail.file.userId !== req.user.id) {
            if (!canInteract(req.user.role, thumbnail.file.User?.role)) throw new ApiError(9002);
          }

          const size = await datasource.size(thumbnail.path);
          if (!size) throw new ApiError(9002);

          const buf = await datasource.get(thumbnail.path);
          if (!buf) throw new ApiError(9002);

          return res
            .type(await guess(thumbnail.path.replace('.thumbnail-', '').split('.').pop() || 'jpg'))
            .headers({
              'Content-Length': size,
            })
            .status(200)
            .send(buf);
        }

        const file = await getFile(id, { thumbnail: false, tags: false, owner: true });
        if (!file) throw new ApiError(9002);

        if (file.userId !== req.user.id) {
          if (!canInteract(req.user.role, file.User?.role)) throw new ApiError(9002);
        }

        if (file.deletesAt && file.deletesAt <= new Date()) {
          try {
            await datasource.delete(file.name);
            await removeFile(file.id);
          } catch (e) {
            logger
              .error('failed to delete file on expiration', {
                id: file.id,
              })
              .error(e as Error);
          }

          throw new ApiError(9002);
        }

        if (file.maxViews && file.views >= file.maxViews) {
          if (!config.features.deleteOnMaxViews) throw new ApiError(9002);

          try {
            await datasource.delete(file.name);
            await removeFile(file.id);
          } catch (e) {
            logger
              .error('failed to delete file on max views', {
                id: file.id,
              })
              .error(e as Error);
          }

          throw new ApiError(9002);
        }

        if (file.password) {
          const valid = verifyAccessToken(token, 'file', file.id);
          if (!valid) throw new ApiError(3018);
        }

        const size = file.size || (await datasource.size(file.name));
        const fileType = file.type || 'application/octet-stream';
        const contentType = fileType.startsWith('text/') ? `${fileType}; charset=utf-8` : fileType;

        const commonHeaders = {
          'Content-Disposition': file.originalName
            ? `${download ? 'attachment; ' : ''}filename*=utf-8''${encodeURIComponent(file.originalName)}`
            : download
              ? 'attachment;'
              : undefined,
        };

        if (req.headers.range) {
          const [start, end] = parseRange(req.headers.range, size);
          if (start >= size || end >= size) {
            const buf = await datasource.get(file.name);
            if (!buf) throw new ApiError(9002);

            return res
              .type(contentType)
              .headers({
                'Content-Length': size,
                ...commonHeaders,
              })
              .status(416)
              .send(buf);
          }

          const buf = await datasource.range(file.name, start || 0, end);
          if (!buf) throw new ApiError(9002);

          return res
            .type(contentType)
            .headers({
              'Content-Range': `bytes ${start}-${end}/${size}`,
              'Accept-Ranges': 'bytes',
              'Content-Length': end - start + 1,
              ...commonHeaders,
            })
            .status(206)
            .send(buf);
        }

        const buf = await datasource.get(file.name);
        if (!buf) throw new ApiError(9002);

        return res
          .type(contentType)
          .headers({
            'Content-Length': size,
            'Accept-Ranges': 'bytes',
            ...commonHeaders,
          })
          .status(200)
          .send(buf);
      },
    );
  },
  { name: PATH },
);
