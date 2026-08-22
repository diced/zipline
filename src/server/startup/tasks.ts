import { db } from '@/lib/db';
import { thumbnails } from '@/lib/db/schema';
import { Tasks } from '@/lib/tasks';
import cleanThumbnails from '@/lib/tasks/run/cleanThumbnails';
import clearInvites from '@/lib/tasks/run/clearInvites';
import deleteFiles from '@/lib/tasks/run/deleteFiles';
import maxViews from '@/lib/tasks/run/maxViews';
import metrics from '@/lib/tasks/run/metrics';
import thumbnailTask from '@/lib/tasks/run/thumbnails';
import type { DomainDbRequest, DomainDbResponse } from '@/offload/proxiedDb';
import type { FastifyInstance } from 'fastify';
import ms, { StringValue } from 'ms';
import type { Worker } from 'worker_threads';

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
    tasks.interval('thumbnails', ms(config.tasks.thumbnailsInterval as StringValue), thumbnailTask());

    for (let i = 0; i !== config.features.thumbnails.num_threads; ++i) {
      tasks.worker(
        `thumbnail-${i}`,
        'offload/thumbnails.js',
        {
          id: `thumbnail-${i}`,
          enabled: config.features.thumbnails.enabled,
        },
        async function (this: Worker, message: DomainDbRequest) {
          if (message.type !== 'db') return;

          try {
            let result: unknown = null;
            switch (message.command) {
              case 'file.thumbnailSource': {
                const file = await db.query.files.findFirst({
                  columns: { id: true, name: true, type: true, size: true },
                  where: { id: message.payload.id },
                });
                result = file ?? null;
                break;
              }
              case 'thumbnail.upsert': {
                const [record] = await db
                  .insert(thumbnails)
                  .values(message.payload)
                  .onConflictDoUpdate({
                    target: thumbnails.fileId,
                    set: { path: message.payload.path, createdAt: new Date() },
                  })
                  .returning({ id: thumbnails.id });
                if (!record) throw new Error('Thumbnail upsert did not return a row');
                result = record;
                break;
              }
              default:
                throw new Error(`Unknown thumbnail worker DB command: ${message.command}`);
            }

            this.postMessage({
              type: 'db-response',
              id: message.id,
              ok: true,
              result,
            } satisfies DomainDbResponse);
          } catch (error) {
            this.postMessage({
              type: 'db-response',
              id: message.id,
              ok: false,
              error:
                error instanceof Error
                  ? {
                      name: error.name,
                      message: error.message,
                      ...(error.stack && { stack: error.stack }),
                    }
                  : { name: 'Error', message: String(error) },
            } satisfies DomainDbResponse);
          }
        },
      );
    }
  }

  tasks.start();
}
