import { db } from '@/lib/db';
import { metricSchema } from '@/lib/db/models/metric';
import { metrics as metricRecords } from '@/lib/db/schema';
import { queryStats } from '@/lib/stats';
import { IntervalTask } from '..';

export default function metrics() {
  return async function (this: IntervalTask) {
    const stats = await queryStats();

    const [created] = await db.insert(metricRecords).values({ data: stats }).returning();
    if (!created) throw new Error('Metric insert did not return a row');
    const metric = metricSchema.parse(created);

    this.logger.debug('created metric', {
      id: metric.id,
      metric: stats,
    });
  };
}
