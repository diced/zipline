import { bytes } from '@/lib/bytes';
import { Metric } from '@/lib/db/models/metric';
import { Paper, Title } from '@mantine/core';
import dynamic from 'next/dynamic';

const Line = dynamic(() => import('@ant-design/plots').then(({ Line }) => Line), { ssr: false });

export default function StorageGraph({ metrics }: { metrics: Metric[] }) {
  return (
    <Paper radius='sm' withBorder p='sm' mt='md'>
      <Title order={3} mb='sm'>
        Storage Used
      </Title>

      <Line
        data={metrics.map((metric) => ({
          date: metric.createdAt,
          storage: metric.data.storage,
        }))}
        xField='date'
        yField='storage'
        xAxis={{
          type: 'time',
          mask: 'YYYY-MM-DD HH:mm:ss',
        }}
        yAxis={{
          label: {
            formatter: (v) => bytes(Number(v)),
          },
        }}
        tooltip={{
          formatter: (v) => ({ name: 'Storage Used', value: bytes(Number(v.storage)) }),
        }}
        smooth
      />
    </Paper>
  );
}
