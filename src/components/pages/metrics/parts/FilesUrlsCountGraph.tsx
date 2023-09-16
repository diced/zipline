import { Metric } from '@/lib/db/models/metric';
import { Paper, Title } from '@mantine/core';
import dynamic from 'next/dynamic';

const Line = dynamic(() => import('@ant-design/plots').then(({ Line }) => Line), { ssr: false });

export default function FilesUrlsCountGraph({ metrics }: { metrics: Metric[] }) {
  return (
    <Paper radius='sm' withBorder p='sm'>
      <Title order={3}>Count</Title>

      <Line
        data={[
          ...metrics.map((metric) => ({
            date: metric.createdAt,
            sum: metric.data.files,
            type: 'Files',
          })),
          ...metrics.map((metric) => ({
            date: metric.createdAt,
            sum: metric.data.urls,
            type: 'URLs',
          })),
        ]}
        xField='date'
        yField='sum'
        seriesField='type'
        xAxis={{
          type: 'time',
          mask: 'YYYY-MM-DD HH:mm:ss',
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
