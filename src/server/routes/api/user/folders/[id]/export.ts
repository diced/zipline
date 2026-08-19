import { ApiError } from '@/lib/api/errors';
import { datasource } from '@/lib/datasource';
import { findFolderRowById, getOwnedFolderTree, type FolderTree } from '@/lib/db/models/folder';
import { log } from '@/lib/logger';
import { userMiddleware } from '@/server/middleware/user';
import typedPlugin from '@/server/typedPlugin';
import archiver, { Archiver } from 'archiver';
import z from 'zod';

export type ApiUserFoldersIdExportResponse = null;

const logger = log('api').c('user').c('folders').c('[id]').c('export');

async function addFolderToZip(
  zip: Archiver,
  folder: FolderTree,
  basePath: string,
  logger: ReturnType<typeof log>,
): Promise<number> {
  let fileCount = 0;

  for (const file of folder.files) {
    const stream = await datasource.get(file.name);
    if (!stream) {
      logger.warn('failed to get file stream for folder export', { file: file.id, folder: folder.id });
      continue;
    }

    const filePath = basePath ? `${basePath}/${file.name}` : file.name;
    zip.append(stream, { name: filePath });
    fileCount++;
  }

  for (const child of folder.children) {
    const childPath = basePath ? `${basePath}/${child.name}` : child.name;
    fileCount += await addFolderToZip(zip, child, childPath, logger);
  }

  return fileCount;
}

export const PATH = '/api/user/folders/:id/export';
export default typedPlugin(
  async (server) => {
    server.get(
      PATH,
      {
        schema: {
          description: 'Download a ZIP archive of all files contained in a folder and its subfolders.',
          params: z.object({ id: z.string() }),
          tags: ['auth'],
        },
        preHandler: [userMiddleware],
      },
      async (req, res) => {
        const { id } = req.params;

        const folder = await findFolderRowById(id);

        if (!folder) throw new ApiError(4001);
        if (req.user.id !== folder.userId) throw new ApiError(3011);

        const folderTree = await getOwnedFolderTree(id, req.user.id);
        if (!folderTree) throw new ApiError(4001);

        logger.info(`folder export requested: ${folder.name}`, { user: req.user.id, folder: folder.id });

        res.hijack();

        const dl = `${folder.name}.zip`;
        const sanitized = dl.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_');

        res.raw.setHeader('Content-Type', 'application/zip');
        res.raw.setHeader(
          'Content-Disposition',
          `attachment; filename="${sanitized}"; filename*=UTF-8''${encodeURIComponent(dl)}`,
        );

        const zip = archiver('zip', {
          zlib: { level: 9 },
        });

        zip.pipe(res.raw);

        const fileCount = await addFolderToZip(zip, folderTree, '', logger);

        if (fileCount === 0) {
          logger.warn('folder export has no files, aborting.', { folder: folder.id });

          zip.abort();
        }

        zip.on('error', (err) => {
          logger.error('error during folder export zip creation', { folder: folder.id }).error(err as Error);
        });

        zip.on('finish', () => {
          logger.info(`folder export completed: ${folder.name}`, {
            user: req.user.id,
            folder: folder.id,
            files: fileCount,
          });
        });

        await zip.finalize();
      },
    );
  },
  { name: PATH },
);
