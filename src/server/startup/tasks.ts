import { db } from '@/lib/db';
import { thumbnails as thumbnailTable } from '@/lib/db/schema';
import { Tasks } from '@/lib/tasks';
import cleanThumbnails from '@/lib/tasks/run/cleanThumbnails';
import clearInvites from '@/lib/tasks/run/clearInvites';
import deleteFiles from '@/lib/tasks/run/deleteFiles';
import maxViews from '@/lib/tasks/run/maxViews';
import metrics from '@/lib/tasks/run/metrics';
import thumbnails from '@/lib/tasks/run/thumbnails';
import type { DomainDbRequest, DomainDbResponse } from '@/offload/proxiedDb';
import type { FastifyInstance } from 'fastify';
import ms, { StringValue } from 'ms';
import type { Worker } from 'worker_threads';
import { eq } from 'drizzle-orm';

export function startTasks(server: FastifyInstance) {
  const config = global.__config__;
  const tasks = new Tasks();
  server.decorate('tasks', tasks);

  tasks.interval('deletefiles', ms(config.tasks.deleteInterval as StringValue), deleteFiles());
  tasks.interval('maxviews', ms(config.tasks.maxViewsInterval as StringValue), maxViews());
  tasks.interval('clearinvites', ms(config.tasks.clearInvitesInterval as StringValue), clearInvites());
  tasks.interval(
    'cleanthumbnails',
    ms(config.tasks.cleanThumbnailsInterval as StringValue),
    cleanThumbnails(),
  );

  if (config.features.metrics.enabled)
    tasks.interval('metrics', ms(config.tasks.metricsInterval as StringValue), metrics());

  if (config.features.thumbnails.enabled) {
    tasks.interval('thumbnails', ms(config.tasks.thumbnailsInterval as StringValue), thumbnails());

    for (let i = 0; i !== config.features.thumbnails.num_threads; ++i) {
      tasks.worker(
        `thumbnail-${i}`,
        'offload/thumbnails.js',
        {
          id: `thumbnail-${i}`,
          enabled: config.features.thumbnails.enabled,
        },
        async function (this: Worker, message: DomainDbRequest) {
          if (message.type === 'db') {
            let result: unknown = null;
            switch (message.command) {
              case 'file.thumbnailSource': {
                const file = await db.query.files.findFirst({
                  where: { id: message.payload.id },
                  with: { thumbnail: { columns: { path: true } } },
                });
                result = file ?? null;
                break;
              }
              case 'thumbnail.byFile':
                result =
                  (
                    await db
                      .select()
                      .from(thumbnailTable)
                      .where(eq(thumbnailTable.fileId, message.payload.fileId))
                      .limit(1)
                  )[0] ?? null;
                break;
              case 'thumbnail.create': {
                const [created] = await db.insert(thumbnailTable).values(message.payload).returning();
                if (!created) throw new Error('Thumbnail insert did not return a row');
                result = created;
                break;
              }
              case 'thumbnail.touch': {
                const createdAt =
                  message.payload.createdAt instanceof Date
                    ? message.payload.createdAt
                    : new Date(message.payload.createdAt);
                const [updated] = await db
                  .update(thumbnailTable)
                  .set({ createdAt })
                  .where(eq(thumbnailTable.id, message.payload.id))
                  .returning();
                result = updated ?? null;
                break;
              }
              default:
                console.error(`Unknown thumbnail worker DB command: ${message.command}`);
            }

            this.postMessage({
              type: 'db-response',
              id: message.id,
              result: JSON.stringify(result),
            } satisfies DomainDbResponse);
          }
        },
      );
    }
  }

  tasks.start();
}
