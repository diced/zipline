import { bytes } from '@/lib/bytes';
import { datasource } from '@/lib/datasource';
import { db } from '@/lib/db';
import { removeFiles } from '@/lib/db/models/file';
import { files } from '@/lib/db/schema';
import { and, isNotNull, lte } from 'drizzle-orm';
import { IntervalTask } from '..';

export default function deleteFiles() {
  return async function (this: IntervalTask) {
    const expiredFiles = await db.query.files.findMany({
      columns: { id: true, name: true, size: true },
      where: and(isNotNull(files.deletesAt), lte(files.deletesAt, new Date())),
    });

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

    const count = await removeFiles(expiredFiles.map((f) => f.id));

    if (count)
      this.logger.info(`deleted ${count} expired files`, {
        size: bytes(expiredFiles.reduce((acc, f) => acc + f.size, 0)),
        files: expiredFiles.map((f) => f.name),
      });
  };
}
