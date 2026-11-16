import { datasource } from '@/lib/datasource';
import { db } from '@/lib/db';
import { lockFiles } from '@/lib/db/models/file';
import { thumbnails } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';
import { IntervalTask } from '..';

export default function cleanThumbnails() {
  return async function (this: IntervalTask) {
    const fsThumbnails = await datasource.list({ prefix: '.thumbnail.' });
    const dbThumbnails = await db.select({ id: thumbnails.id, path: thumbnails.path }).from(thumbnails);

    const dbPaths = new Set(dbThumbnails.map((t) => t.path));
    const fsOrphaned = fsThumbnails.filter((path) => !dbPaths.has(path));
    let fsDeleted = 0;

    for (const path of fsOrphaned) {
      try {
        const deleted = await db.transaction(async (tx) => {
          await lockFiles(tx);

          const [thumbnail] = await tx
            .select({ id: thumbnails.id })
            .from(thumbnails)
            .where(eq(thumbnails.path, path))
            .limit(1);
          if (thumbnail) return false;

          await datasource.delete(path);
          return true;
        });
        if (!deleted) continue;

        fsDeleted++;
        this.logger.info('deleted orphaned thumbnail', { path });
      } catch (err) {
        this.logger.error('failed to delete orphaned thumbnail', { path, error: err });
      }
    }

    const fsPaths = new Set(fsThumbnails);
    const dbOrphaned = dbThumbnails.filter((t) => !fsPaths.has(t.path));
    let dbDeleted = 0;

    for (const thumb of dbOrphaned) {
      try {
        if (await datasource.size(thumb.path)) continue;

        const deleted = await db
          .delete(thumbnails)
          .where(and(eq(thumbnails.id, thumb.id), eq(thumbnails.path, thumb.path)))
          .returning({ id: thumbnails.id });
        if (!deleted.length) continue;

        dbDeleted++;
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
      fsDeleted,
      dbDeleted,
      totals: {
        fs: fsThumbnails.length - fsDeleted,
        db: dbThumbnails.length - dbDeleted,
      },
    });
  };
}
