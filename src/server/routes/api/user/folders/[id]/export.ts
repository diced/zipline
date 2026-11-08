import { ApiError } from '@/lib/api/errors';
import { datasource } from '@/lib/datasource';
import { getFolderMetadata, getOwnedTree, type FolderTree } from '@/lib/db/models/folder';
import { log } from '@/lib/logger';
import { userMiddleware } from '@/server/middleware/user';
import typedPlugin from '@/server/typedPlugin';
import { ZipArchive, type Archiver } from 'archiver';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';
import z from 'zod';

export type ApiUserFoldersIdExportResponse = null;

const logger = log('api').c('user').c('folders').c('[id]').c('export');

async function addFolderToZip(
  zip: Archiver,
  folder: FolderTree,
  basePath: string,
  logger: ReturnType<typeof log>,
  streams: Readable[],
): Promise<number> {
  let fileCount = 0;

  for (const file of folder.files) {
    const stream = await datasource.get(file.name);
    if (zip.destroyed) {
      stream?.destroy();
      return fileCount;
    }

    if (!stream) {
      logger.warn('failed to get file stream for folder export', { file: file.id, folder: folder.id });
      continue;
    }

    const filePath = basePath ? `${basePath}/${file.name}` : file.name;
    streams.push(stream);
    stream.once('error', (error) => zip.destroy(error));
    zip.append(stream, { name: filePath });
    fileCount++;
  }

  for (const child of folder.children) {
    const childPath = basePath ? `${basePath}/${child.name}` : child.name;
    fileCount += await addFolderToZip(zip, child, childPath, logger, streams);
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

        const folder = await getFolderMetadata(id);

        if (!folder) throw new ApiError(4001);
        if (req.user.id !== folder.userId) throw new ApiError(3011);

        const folderTree = await getOwnedTree(id, req.user.id);
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

        const zip = new ZipArchive({
          zlib: { level: 9 },
        });

        const streams: Readable[] = [];
        let failed = false;
        function failExport(error: unknown) {
          if (failed) return;
          failed = true;

          logger.error('error during folder export zip creation', { folder: id }).error(error as Error);
          zip.abort();
          zip.destroy();
          for (const stream of streams) stream.destroy();
          res.raw.destroy();
        }

        const completed = pipeline(zip, res.raw);
        void completed.catch(failExport);

        try {
          const fileCount = await addFolderToZip(zip, folderTree, '', logger, streams);
          if (failed) return;

          if (fileCount === 0) {
            logger.warn('folder export has no files, aborting.', { folder: folder.id });

            zip.abort();
            await completed;
            return;
          }

          await zip.finalize();
          await completed;

          logger.info(`folder export completed: ${folder.name}`, {
            user: req.user.id,
            folder: folder.id,
            files: fileCount,
          });
        } catch (error) {
          failExport(error);
        }
      },
    );
  },
  { name: PATH },
);
