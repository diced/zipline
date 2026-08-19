import { bytes } from '@/lib/bytes';
import { datasource } from '@/lib/datasource';
import { deleteFilesByIds, listExpiredFiles } from '@/lib/db/models/file';
import { IntervalTask } from '..';

export default function deleteFiles() {
  return async function (this: IntervalTask) {
    const expiredFiles = await listExpiredFiles();

    this.logger.debug(`found ${expiredFiles.length} expired files`, {
      files: expiredFiles.map((f) => f.name),
    });

    for (const file of expiredFiles) {
      try {
        await datasource.delete(file.name);
      } catch {
        this.logger.error('failed to delete file from datasource', {
          file: file.name,
        });
      }
    }

    const count = await deleteFilesByIds(expiredFiles.map((f) => f.id));

    if (count)
      this.logger.info(`deleted ${count} expired files`, {
        size: bytes(expiredFiles.reduce((acc, f) => acc + f.size, 0)),
        files: expiredFiles.map((f) => f.name),
      });
  };
}
