import { db } from '@/lib/db';
import { metrics } from '@/lib/db/schema';
import { queryStats } from '@/lib/stats';
import { IntervalTask } from '..';

export default function metricsTask() {
  return async function (this: IntervalTask) {
    const stats = await queryStats();

    const [created] = await db.insert(metrics).values({ data: stats }).returning({ id: metrics.id });
    if (!created) throw new Error('Metric insert did not return a row');

    this.logger.debug('created metric', {
      id: created.id,
      metric: stats,
    });
  };
}
