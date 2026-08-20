import { datasource } from '@/lib/datasource';
import { db } from '@/lib/db';
import { thumbnails } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { IntervalTask } from '..';

export default function cleanThumbnails() {
  return async function (this: IntervalTask) {
    const fsThumbnails = await datasource.list({ prefix: '.thumbnail.' });
    const dbThumbnails = await db.select({ id: thumbnails.id, path: thumbnails.path }).from(thumbnails);

    const paths = new Set(dbThumbnails.map((t) => t.path));
    const fsOrphaned = fsThumbnails.filter((path) => !paths.has(path));

    for (const path of fsOrphaned) {
      try {
        await datasource.delete(path);
        this.logger.info('deleted orphaned thumbnail', { path });
      } catch (err) {
        this.logger.error('failed to delete orphaned thumbnail', { path, error: err });
      }
    }

    const fs = new Set(fsThumbnails);
    const dbOrphaned = dbThumbnails.filter((t) => !fs.has(t.path));

    for (const thumb of dbOrphaned) {
      try {
        await db.delete(thumbnails).where(eq(thumbnails.id, thumb.id));
        this.logger.info('deleted orphaned thumbnail from database', { path: thumb.path });
      } catch (err) {
        this.logger.error('failed to delete orphaned thumbnail from database', {
          path: thumb.path,
          error: err,
        });
      }
    }

    this.logger.debug('thumbnail cleanup complete', {
      fsChecked: fsThumbnails.length,
      dbChecked: dbThumbnails.length,
      fsDeleted: fsOrphaned.length,
      dbDeleted: dbOrphaned.length,
      totals: {
        fs: fsThumbnails.length - fsOrphaned.length,
        db: dbThumbnails.length - dbOrphaned.length,
      },
    });
  };
}
