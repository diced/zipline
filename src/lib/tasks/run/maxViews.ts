import { datasource } from '@/lib/datasource';
import { IntervalTask } from '..';
import { bytes } from '@/lib/bytes';
import { config } from '@/lib/config';
import { db } from '@/lib/db';
import { deleteFilesByIds, listFilesAtMaxViews } from '@/lib/db/models/file';
import { deleteUrlsByIds, listUrlsAtMaxViews } from '@/lib/db/models/url';

export default function maxViews() {
  return async function (this: IntervalTask) {
    const files = await listFilesAtMaxViews();

    this.logger.debug(`found ${files.length} expired files`, {
      files: files.map((f) => f.name),
    });

    const urls = await listUrlsAtMaxViews();

    this.logger.debug(`found ${urls.length} expired urls`, {
      dests: urls.map((u) => u.destination),
    });

    if (!config.features.deleteOnMaxViews) {
      this.logger.warn('deleteOnMaxViews is disabled, skipping deletion of files and urls');
      return;
    }

    for (const file of files) {
      try {
        await datasource.delete(file.name);
      } catch {
        this.logger.error('failed to delete file from datasource', {
          file: file.name,
        });
      }
    }

    const [fileCount, urlCount] = await db.transaction(async (tx) =>
      Promise.all([
        deleteFilesByIds(
          files.map((f) => f.id),
          tx,
        ),
        deleteUrlsByIds(
          urls.map((u) => u.id),
          tx,
        ),
      ]),
    );

    if (fileCount)
      this.logger.info(`deleted ${fileCount} files due to max views`, {
        size: bytes(files.reduce((acc, f) => acc + f.size, 0)),
        files: files.map((f) => f.name),
      });

    if (urlCount)
      this.logger.info(`deleted ${urlCount} urls due to max views`, {
        dests: urls.map((u) => u.destination),
      });
  };
}
