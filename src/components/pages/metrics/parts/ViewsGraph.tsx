import { MetricsPoint } from '@/lib/metrics';
import { ChartTooltip, LineChart } from '@mantine/charts';
import { Paper, Title } from '@mantine/core';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { defaultChartProps, formatChartDate, sortByCreatedAt } from '../statsHelpers';

export default function ViewsGraph({ points }: { points: MetricsPoint[] }) {
  const { t } = useTranslation('metrics');
  const data = useMemo(
    () =>
      sortByCreatedAt(points).map((point) => ({
        date: new Date(point.createdAt).getTime(),
        files: point.fileViews,
        urls: point.urlViews,
      })),
    [points],
  );

  return (
    <Paper radius='md' withBorder p='sm'>
      <Title order={3}>{t('graphs.views.title')}</Title>
      <LineChart
        data={data}
        series={[
          {
            name: 'files',
            label: t('graphs.series.files'),
            color: 'blue',
          },
          {
            name: 'urls',
            label: t('graphs.series.urls'),
            color: 'green',
          },
        ]}
        xAxisProps={{
          tickFormatter: formatChartDate,
        }}
        tooltipProps={{
          content: ({ label, payload }) => (
            <ChartTooltip
              label={formatChartDate(label)}
              payload={payload}
              series={[
                { name: 'files', label: t('graphs.series.files') },
                { name: 'urls', label: t('graphs.series.urls') },
              ]}
              valueFormatter={(v) => t('graphs.views.value', { count: v })}
            />
          ),
        }}
        {...defaultChartProps}
      />
    </Paper>
  );
}
