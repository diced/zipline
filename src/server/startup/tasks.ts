import { prisma } from '@/lib/db';
import { Tasks } from '@/lib/tasks';
import cleanThumbnails from '@/lib/tasks/run/cleanThumbnails';
import clearInvites from '@/lib/tasks/run/clearInvites';
import deleteFiles from '@/lib/tasks/run/deleteFiles';
import maxViews from '@/lib/tasks/run/maxViews';
import metrics from '@/lib/tasks/run/metrics';
import thumbnails from '@/lib/tasks/run/thumbnails';
import type { FastifyInstance } from 'fastify';
import ms, { StringValue } from 'ms';

export function startTasks(server: FastifyInstance) {
  const config = global.__config__;
  const tasks = new Tasks();
  server.decorate('tasks', tasks);

  tasks.interval('deletefiles', ms(config.tasks.deleteInterval as StringValue), deleteFiles(prisma));
  tasks.interval('maxviews', ms(config.tasks.maxViewsInterval as StringValue), maxViews(prisma));
  tasks.interval('clearinvites', ms(config.tasks.clearInvitesInterval as StringValue), clearInvites(prisma));
  tasks.interval(
    'cleanthumbnails',
    ms(config.tasks.cleanThumbnailsInterval as StringValue),
    cleanThumbnails(prisma),
  );

  if (config.features.metrics)
    tasks.interval('metrics', ms(config.tasks.metricsInterval as StringValue), metrics(prisma));

  if (config.features.thumbnails.enabled) {
    tasks.interval('thumbnails', ms(config.tasks.thumbnailsInterval as StringValue), thumbnails(prisma));

    for (let i = 0; i !== config.features.thumbnails.num_threads; ++i) {
      tasks.worker(
        `thumbnail-${i}`,
        'offload/thumbnails.js',
        {
          id: `thumbnail-${i}`,
          enabled: config.features.thumbnails.enabled,
        },
        async function (this: Worker, message: any) {
          if (message.type === 'query') {
            const { id, query, data } = message;

            let result: any = null;
            switch (query) {
              case 'file.findUnique':
                result = await prisma.file.findUnique(data);
                break;
              case 'thumbnail.findFirst':
                result = await prisma.thumbnail.findFirst(data);
                break;
              case 'thumbnail.create':
                result = await prisma.thumbnail.create(data);
                break;
              case 'thumbnail.update':
                result = await prisma.thumbnail.update(data);
                break;
              default:
                console.error(`Unknown DB query: ${query}`);
            }

            this.postMessage({
              type: 'response',
              id,
              result: JSON.stringify(result),
            });
          }
        },
      );
    }
  }

  tasks.start();
}
