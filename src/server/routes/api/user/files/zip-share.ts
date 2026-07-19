import { ApiError } from '@/lib/api/errors';
import { checkQuota, getDomain, getFilename } from '@/lib/api/upload';
import { config } from '@/lib/config';
import { hashPassword } from '@/lib/crypto';
import { datasource } from '@/lib/datasource';
import { prisma } from '@/lib/db';
import { fileSelect } from '@/lib/db/models/file';
import { log } from '@/lib/logger';
import { randomCharacters } from '@/lib/random';
import { formatRootUrl } from '@/lib/url';
import { userMiddleware } from '@/server/middleware/user';
import typedPlugin from '@/server/typedPlugin';
import archiver from 'archiver';
import { buffer } from 'node:stream/consumers';
import z from 'zod';

export type ApiUserFilesZipShareResponse = {
  url: string;
  fileId: string;
  urlId: string;
};

const logger = log('api').c('user').c('files').c('zip-share');

export const PATH = '/api/user/files/zip-share';
export default typedPlugin(
  async (server) => {
    server.post(
      PATH,
      {
        schema: {
          description:
            'Create a ZIP archive from selected files, store it as a regular file, and create a shareable URL.',
          body: z.object({
            files: z.array(z.string()).min(1),
            zipName: z
              .string()
              .trim()
              .min(1)
              .max(255)
              .transform((name) => {
                const base = name.replace(/\.zip$/i, '').trim();
                return base ? `${base}.zip` : 'archive.zip';
              })
              .default('archive.zip'),
          }),
          headers: z.object({
            'x-zipline-max-views': z.coerce.number().min(1).optional(),
            'x-zipline-domain': z.string().optional(),
            'x-zipline-password': z.string().optional(),
          }),
          response: {
            200: z.object({
              url: z.string(),
              fileId: z.string(),
              urlId: z.string(),
            }),
          },
          tags: ['auth'],
        },
        preHandler: [userMiddleware],
      },
      async (req, res) => {
        const { files: fileIds, zipName } = req.body;

        const existingFiles = await prisma.file.findMany({
          where: {
            id: { in: fileIds },
            userId: req.user.id,
          },
        });

        if (existingFiles.length === 0) throw new ApiError(1026);
        if (existingFiles.length !== fileIds.length) {
          throw new ApiError(3014, "You don't have permission to zip some of the selected files");
        }

        const totalSize = existingFiles.reduce((acc, file) => acc + Number(file.size), 0);
        const quotaCheck = await checkQuota(req.user, totalSize, 1);
        if (quotaCheck !== true)
          throw new ApiError(5002, typeof quotaCheck === 'string' ? quotaCheck : undefined);

        const folderName = 'zip shares';
        let folder = await prisma.folder.findFirst({
          where: {
            name: folderName,
            userId: req.user.id,
            parentId: null,
          },
        });

        if (!folder) {
          folder = await prisma.folder.create({
            data: {
              name: folderName,
              userId: req.user.id,
              public: false,
            },
          });
        }

        const nameResult = await getFilename(config.files.defaultFormat, zipName, '.zip');
        if ('error' in nameResult) throw new ApiError(1009, nameResult.error);

        const zip = archiver('zip', { zlib: { level: 6 } });
        const zipBufferPromise = buffer(zip);
        const seenNames = new Set<string>();

        for (const file of existingFiles) {
          const stream = await datasource.get(file.name);
          if (!stream) {
            logger.warn('failed to get file stream for zip', { file: file.id });
            continue;
          }

          let entryName = file.originalName || file.name;
          if (seenNames.has(entryName)) {
            const ext = entryName.includes('.') ? entryName.slice(entryName.lastIndexOf('.')) : '';
            const base = entryName.slice(0, entryName.length - ext.length);
            let counter = 2;
            let nextName = `${base}_${counter}${ext}`;
            while (seenNames.has(nextName)) {
              counter++;
              nextName = `${base}_${counter}${ext}`;
            }
            entryName = nextName;
          }
          seenNames.add(entryName);

          zip.append(stream, { name: entryName });
        }

        await zip.finalize();
        const zipBuffer = await zipBufferPromise;

        if (zipBuffer.length === 0) throw new ApiError(1062, 'Zip archive is empty');

        const zipFile = await prisma.file.create({
          data: {
            name: `${nameResult.fileName}.zip`,
            size: zipBuffer.length,
            type: 'application/zip',
            User: { connect: { id: req.user.id } },
            Folder: { connect: { id: folder.id } },
          },
          select: fileSelect,
        });

        await datasource.put(zipFile.name, zipBuffer, { mimetype: 'application/zip' });

        const fileUrl = `${getDomain(
          req.headers['x-zipline-domain'] as string | undefined,
          config.core.defaultDomain,
          req.headers.host,
        )}${formatRootUrl(config.files.route, zipFile.name)}`;

        let code, existingCode;
        do {
          code = randomCharacters(config.urls.length);
          existingCode = await prisma.url.findFirst({ where: { code } });
        } while (existingCode);

        const maxViews = req.headers['x-zipline-max-views'];
        const password = req.headers['x-zipline-password']
          ? await hashPassword(req.headers['x-zipline-password'])
          : undefined;

        const url = await prisma.url.create({
          data: {
            userId: req.user.id,
            destination: fileUrl,
            code,
            ...(maxViews && { maxViews }),
            ...(password && { password }),
          },
          omit: {
            password: true,
          },
        });

        const responseUrl = `${getDomain(
          req.headers['x-zipline-domain'] as string | undefined,
          config.core.defaultDomain,
          req.headers.host,
        )}${config.urls.route === '/' || config.urls.route === '' ? '' : config.urls.route}/${url.vanity ?? url.code}`;

        logger.info(`${req.user.username} created zip share`, {
          user: req.user.id,
          files: existingFiles.length,
          zipFile: zipFile.id,
          url: url.id,
        });

        return res.send({
          url: responseUrl,
          fileId: zipFile.id,
          urlId: url.id,
        });
      },
    );
  },
  { name: PATH },
);
