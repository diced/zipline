import { datasource } from '@/lib/datasource';
import { IntervalTask } from '..';
import { bytes } from '@/lib/bytes';
import { config } from '@/lib/config';
import { db } from '@/lib/db';
import { removeFiles } from '@/lib/db/models/file';
import { files, urls } from '@/lib/db/schema';
import { and, gte, inArray, isNotNull } from 'drizzle-orm';

export default function maxViews() {
  return async function (this: IntervalTask) {
    const expiredFiles = await db
      .select({ id: files.id, name: files.name, size: files.size })
      .from(files)
      .where(and(isNotNull(files.maxViews), gte(files.views, files.maxViews)));

    this.logger.debug(`found ${expiredFiles.length} expired files`, {
      files: expiredFiles.map((file) => file.name),
    });

    const expiredUrls = await db
      .select({ id: urls.id, destination: urls.destination })
      .from(urls)
      .where(and(isNotNull(urls.maxViews), gte(urls.views, urls.maxViews)));

    this.logger.debug(`found ${expiredUrls.length} expired urls`, {
      dests: expiredUrls.map((url) => url.destination),
    });

    if (!config.features.deleteOnMaxViews) {
      this.logger.warn('deleteOnMaxViews is disabled, skipping deletion of files and urls');
      return;
    }

    for (const file of expiredFiles) {
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
        expiredFiles.map((file) => file.id),
        tx,
      );
      let urlCount = 0;
      if (expiredUrls.length) {
        const deletedUrls = await tx
          .delete(urls)
          .where(
            inArray(
              urls.id,
              expiredUrls.map((url) => url.id),
            ),
          )
          .returning({ id: urls.id });
        urlCount = deletedUrls.length;
      }
      return [fileCount, urlCount];
    });

    if (fileCount)
      this.logger.info(`deleted ${fileCount} files due to max views`, {
        size: bytes(expiredFiles.reduce((acc, file) => acc + file.size, 0)),
        files: expiredFiles.map((file) => file.name),
      });

    if (urlCount)
      this.logger.info(`deleted ${urlCount} urls due to max views`, {
        dests: expiredUrls.map((url) => url.destination),
      });
  };
}
