import { bytes } from '@/lib/bytes';
import { MetricsPoint } from '@/lib/metrics';
import { ChartTooltip, LineChart } from '@mantine/charts';
import { Paper, Title } from '@mantine/core';
import { useMemo } from 'react';
import { defaultChartProps } from '../statsHelpers';

export default function StorageGraph({ points }: { points: MetricsPoint[] }) {
  const data = useMemo(
    () =>
      points
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        .map((point) => ({
          date: new Date(point.createdAt).getTime(),
          storage: point.storage,
        })),
    [points],
  );

  return (
    <Paper radius='md' withBorder p='sm' mt='md'>
      <Title order={3} mb='sm'>
        Storage Used
      </Title>

      <LineChart
        data={data}
        series={[
          {
            name: 'storage',
            label: 'Storage Used',
          },
        ]}
        valueFormatter={(v) => bytes(Number(v))}
        xAxisProps={{
          tickFormatter: (v) => new Date(v).toLocaleString(),
        }}
        tooltipProps={{
          content: ({ label, payload }) => (
            <ChartTooltip
              label={new Date(label).toLocaleString()}
              payload={payload}
              valueFormatter={(v) => bytes(Number(v))}
              series={[{ name: 'storage', label: 'Storage Used' }]}
            />
          ),
        }}
        {...defaultChartProps}
        withLegend={false}
      />
    </Paper>
  );
}
