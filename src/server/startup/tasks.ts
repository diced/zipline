import { findFilesByIds } from '@/lib/db/models/file';
import { createThumbnail, findThumbnailByFileId, touchThumbnail } from '@/lib/db/models/thumbnail';
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
                const [file] = await findFilesByIds([message.payload.id], { thumbnail: true, tags: false });
                result = file ?? null;
                break;
              }
              case 'thumbnail.byFile':
                result = await findThumbnailByFileId(message.payload.fileId);
                break;
              case 'thumbnail.create':
                result = await createThumbnail(message.payload);
                break;
              case 'thumbnail.touch': {
                const createdAt =
                  message.payload.createdAt instanceof Date
                    ? message.payload.createdAt
                    : new Date(message.payload.createdAt);
                result = await touchThumbnail(message.payload.id, createdAt);
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
