import { Metric } from '@/lib/db/models/metric';
import { Paper, Title } from '@mantine/core';
import dynamic from 'next/dynamic';

const Line = dynamic(() => import('@ant-design/plots').then(({ Line }) => Line), { ssr: false });

export default function ViewsGraph({ metrics }: { metrics: Metric[] }) {
  return (
    <Paper radius='sm' withBorder p='sm'>
      <Title order={3}>Views</Title>

      <Line
        data={[
          ...metrics.map((metric) => ({
            date: metric.createdAt,
            views: metric.data.fileViews,
            type: 'Files',
          })),
          ...metrics.map((metric) => ({
            date: metric.createdAt,
            views: metric.data.urlViews,
            type: 'URLs',
          })),
        ]}
        xField='date'
        yField='views'
        seriesField='type'
        xAxis={{
          type: 'time',
          mask: 'YYYY-MM-DD HH:mm:ss',
        }}
        yAxis={{
          label: {
            formatter: (v) => `${v} views`,
          },
        }}
        legend={{
          position: 'top',
        }}
        padding='auto'
        smooth
      />
    </Paper>
  );
}
