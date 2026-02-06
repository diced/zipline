import { datasource } from '@/lib/datasource';
import { prisma } from '@/lib/db';
import { log } from '@/lib/logger';
import { userMiddleware } from '@/server/middleware/user';
import typedPlugin from '@/server/typedPlugin';
import archiver, { Archiver } from 'archiver';
import z from 'zod';

export type ApiUserFoldersIdExportResponse = null;

const logger = log('api').c('user').c('folders').c('[id]').c('export');

type FolderWithFilesAndChildren = {
  id: string;
  name: string;
  files: { id: string; name: string }[];
  children: FolderWithFilesAndChildren[];
};

async function getFolderTree(folderId: string, userId: string): Promise<FolderWithFilesAndChildren | null> {
  const folder = await prisma.folder.findUnique({
    where: { id: folderId, userId },
    select: {
      id: true,
      name: true,
      files: { select: { id: true, name: true } },
      children: { select: { id: true } },
    },
  });

  if (!folder) return null;

  const children: FolderWithFilesAndChildren[] = [];
  for (const child of folder.children) {
    const childTree = await getFolderTree(child.id, userId);
    if (childTree) children.push(childTree);
  }

  return {
    id: folder.id,
    name: folder.name,
    files: folder.files,
    children,
  };
}

async function addFolderToZip(
  zip: Archiver,
  folder: FolderWithFilesAndChildren,
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
      { schema: { params: z.object({ id: z.string() }) }, preHandler: [userMiddleware] },
      async (req, res) => {
        const { id } = req.params;

        const folder = await prisma.folder.findUnique({
          where: { id },
          select: { id: true, name: true, userId: true },
        });

        if (!folder) return res.notFound('Folder not found');
        if (req.user.id !== folder.userId) return res.forbidden('You do not own this folder');

        const folderTree = await getFolderTree(id, req.user.id);
        if (!folderTree) return res.notFound('Folder not found');

        logger.info(`folder export requested: ${folder.name}`, { user: req.user.id, folder: folder.id });

        res.hijack();

        res.raw.setHeader('Content-Type', 'application/zip');
        res.raw.setHeader('Content-Disposition', `attachment; filename="${folder.name}.zip"`);

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
