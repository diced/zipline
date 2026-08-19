import { createMetric } from '@/lib/db/models/metric';
import { queryStats } from '@/lib/stats';
import { IntervalTask } from '..';

export default function metrics() {
  return async function (this: IntervalTask) {
    const stats = await queryStats();

    const metric = await createMetric(stats);

    this.logger.debug('created metric', {
      id: metric.id,
      metric: stats,
    });
  };
}
