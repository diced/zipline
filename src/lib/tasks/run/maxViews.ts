import { datasource } from '@/lib/datasource';
import { IntervalTask } from '..';
import { bytes } from '@/lib/bytes';
import { config } from '@/lib/config';
import { db } from '@/lib/db';
import { removeFiles } from '@/lib/db/models/file';
import { files as fileRecords, urls as urlRecords } from '@/lib/db/schema';
import { and, gte, inArray, isNotNull } from 'drizzle-orm';

export default function maxViews() {
  return async function (this: IntervalTask) {
    const files = await db
      .select({ id: fileRecords.id, name: fileRecords.name, size: fileRecords.size })
      .from(fileRecords)
      .where(and(isNotNull(fileRecords.maxViews), gte(fileRecords.views, fileRecords.maxViews)));

    this.logger.debug(`found ${files.length} expired files`, {
      files: files.map((f) => f.name),
    });

    const urls = await db
      .select({ id: urlRecords.id, destination: urlRecords.destination })
      .from(urlRecords)
      .where(and(isNotNull(urlRecords.maxViews), gte(urlRecords.views, urlRecords.maxViews)));

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

    const [fileCount, urlCount] = await db.transaction(async (tx) => {
      const fileCount = await removeFiles(
        files.map((file) => file.id),
        tx,
      );
      const deletedUrls = urls.length
        ? await tx
            .delete(urlRecords)
            .where(
              inArray(
                urlRecords.id,
                urls.map((url) => url.id),
              ),
            )
            .returning({ id: urlRecords.id })
        : [];
      return [fileCount, deletedUrls.length];
    });

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
