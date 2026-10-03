import { bytes } from '@/lib/bytes';
import { MetricsPoint } from '@/lib/metrics';
import { ChartTooltip, LineChart } from '@mantine/charts';
import { Paper, Title } from '@mantine/core';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { defaultChartProps, formatChartDate, sortByCreatedAt } from '../statsHelpers';

export default function StorageGraph({ points }: { points: MetricsPoint[] }) {
  const { t } = useTranslation('metrics');
  const data = useMemo(
    () =>
      sortByCreatedAt(points).map((point) => ({
        date: new Date(point.createdAt).getTime(),
        storage: point.storage,
      })),
    [points],
  );

  return (
    <Paper radius='md' withBorder p='sm' mt='md'>
      <Title order={3} mb='sm'>
        {t('graphs.storage.title')}
      </Title>

      <LineChart
        data={data}
        series={[
          {
            name: 'storage',
            label: t('graphs.series.storageUsed'),
          },
        ]}
        valueFormatter={(v) => bytes(Number(v))}
        xAxisProps={{
          tickFormatter: formatChartDate,
        }}
        tooltipProps={{
          content: ({ label, payload }) => (
            <ChartTooltip
              label={formatChartDate(label)}
              payload={payload}
              valueFormatter={(v) => bytes(Number(v))}
              series={[{ name: 'storage', label: t('graphs.series.storageUsed') }]}
            />
          ),
        }}
        {...defaultChartProps}
        withLegend={false}
      />
    </Paper>
  );
}
