import { Tasks } from '@/lib/tasks';
import cleanThumbnails from '@/lib/tasks/run/cleanThumbnails';
import clearInvites from '@/lib/tasks/run/clearInvites';
import deleteFiles from '@/lib/tasks/run/deleteFiles';
import maxViews from '@/lib/tasks/run/maxViews';
import metrics from '@/lib/tasks/run/metrics';
import thumbnailTask, { thumbnailWorker } from '@/lib/tasks/run/thumbnails';
import type { FastifyInstance } from 'fastify';
import ms, { StringValue } from 'ms';

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
      const id = `thumbnail-${i}`;
      tasks.worker(
        id,
        'offload/thumbnails.js',
        {
          id,
          enabled: config.features.thumbnails.enabled,
        },
        thumbnailWorker(id),
      );
    }
  }

  tasks.start();
}
