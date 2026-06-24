import { MetricsPoint } from '@/lib/metrics';
import { ChartTooltip, LineChart } from '@mantine/charts';
import { Paper, Title } from '@mantine/core';
import { useMemo } from 'react';
import { defaultChartProps } from '../statsHelpers';

export default function ViewsGraph({ points }: { points: MetricsPoint[] }) {
  const data = useMemo(
    () =>
      points
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        .map((point) => ({
          date: new Date(point.createdAt).getTime(),
          files: point.fileViews,
          urls: point.urlViews,
        })),
    [points],
  );

  return (
    <Paper radius='md' withBorder p='sm'>
      <Title order={3}>Views</Title>
      <LineChart
        data={data}
        series={[
          {
            name: 'files',
            label: 'Files',
            color: 'blue',
          },
          {
            name: 'urls',
            label: 'URLs',
            color: 'green',
          },
        ]}
        xAxisProps={{
          tickFormatter: (v) => new Date(v).toLocaleString(),
        }}
        tooltipProps={{
          content: ({ label, payload }) => (
            <ChartTooltip
              label={new Date(label).toLocaleString()}
              payload={payload}
              series={[
                { name: 'files', label: 'Files' },
                { name: 'urls', label: 'URLs' },
              ]}
              valueFormatter={(v) => v + ` view${v === 1 ? '' : 's'}`}
            />
          ),
        }}
        {...defaultChartProps}
      />
    </Paper>
  );
}
