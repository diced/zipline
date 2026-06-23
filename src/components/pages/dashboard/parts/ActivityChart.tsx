import type { Response } from '@/lib/api/response';
import { ChartTooltip, LineChart } from '@mantine/charts';
import { Box, Group, Paper, Select, Skeleton, Text, Title } from '@mantine/core';
import { IconChartAreaLine, IconLogin2, IconUpload } from '@tabler/icons-react';
import dayjs from 'dayjs';
import { useState } from 'react';
import useSWR from 'swr';

const CHART_HEIGHT = 260;

function parseChartDate(value: unknown): dayjs.Dayjs | null {
  if (value == null || value === '') return null;

  if (typeof value === 'number' && Number.isFinite(value)) {
    const d = dayjs(value);
    return d.isValid() ? d : null;
  }

  if (typeof value === 'string') {
    const d = dayjs(value);
    return d.isValid() ? d : null;
  }

  return null;
}

function formatDayLabel(value: unknown) {
  const d = parseChartDate(value);
  if (!d) return '';

  const today = dayjs().startOf('day');
  if (d.isSame(today, 'day')) return 'Today';
  if (d.isSame(today.subtract(1, 'day'), 'day')) return 'Yesterday';
  return d.format('MMM D');
}

export default function ActivityChart() {
  const [days, setDays] = useState(14);
  const { data, isLoading } = useSWR<Response['/api/user/activity']>('/api/user/activity?days=' + days);

  if (isLoading) {
    return (
      <Paper radius='md' withBorder p='md' mt='lg'>
        <Skeleton height={24} width={180} mb='xs' animate />
        <Skeleton height={16} width={240} mb='lg' animate />
        <Skeleton height={CHART_HEIGHT} animate />
      </Paper>
    );
  }

  if (!data?.series.length) return null;

  const chartData = data.series
    .map((point) => {
      const d = dayjs(point.date);
      if (!d.isValid()) return null;

      return {
        date: d.valueOf(),
        uploads: point.uploads,
        logins: point.logins,
      };
    })
    .filter((point) => point !== null);

  if (chartData.length === 0) return null;

  const hasActivity = data.totals.uploads > 0 || data.totals.logins > 0;

  return (
    <Paper radius='md' withBorder p='md' mt='lg'>
      <Group justify='space-between' align='flex-start' mb='lg' wrap='nowrap'>
        <Box>
          <Title order={3} fw={600}>
            Activity
          </Title>
          <Group gap='xs' style={{ alignItems: 'center' }}>
            <Text size='sm' c='dimmed' mt={4}>
              Your uploads and logins over the last{' '}
            </Text>
            <Select
              value={String(days)}
              onChange={(v) => setDays(Number(v))}
              data={[
                { value: '1', label: '1 day' },
                { value: '7', label: '7 days' },
                { value: '14', label: '14 days' },
                { value: '30', label: '30 days' },
              ]}
              size='0.4rem'
              variant='filled'
              p={0}
              m={0}
              fw={500}
              styles={{
                input: {
                  color: 'var(--mantine-primary-color-filled)',
                  padding: 10,
                  width: '10em',
                  fontSize: '0.875rem',
                },
                section: {
                  margin: 0,
                },
                option: {
                  fontSize: '1rem',
                },
                wrapper: {
                  borderRadius: 1,
                },
              }}
              comboboxProps={{
                dropdownPadding: 0,
              }}
            />
          </Group>
        </Box>

        <Group gap='lg' visibleFrom='sm'>
          <Group gap='xs'>
            <IconUpload size='1rem' style={{ opacity: 0.85 }} color='var(--mantine-primary-color-filled)' />
            <Box>
              <Text size='xs' c='dimmed' lh={1.2}>
                Uploads
              </Text>
              <Text size='sm' fw={600} lh={1.3}>
                {data.totals.uploads}
              </Text>
            </Box>
          </Group>
          <Group gap='xs'>
            <IconLogin2 size='1rem' style={{ opacity: 0.65 }} color='var(--mantine-color-gray-5)' />
            <Box>
              <Text size='xs' c='dimmed' lh={1.2}>
                Logins
              </Text>
              <Text size='sm' fw={600} lh={1.3}>
                {data.totals.logins}
              </Text>
            </Box>
          </Group>
        </Group>
      </Group>

      {!hasActivity ? (
        <Paper withBorder h={CHART_HEIGHT} radius='md' p='md' ta='center'>
          <Group align='center' justify='center' h='100%'>
            <IconChartAreaLine size='1.75rem' style={{ opacity: 0.35 }} />
            <Text size='sm' c='dimmed'>
              No uploads or logins in this period yet
            </Text>
          </Group>
        </Paper>
      ) : (
        <LineChart
          h={CHART_HEIGHT}
          data={chartData}
          dataKey='date'
          curveType='natural'
          connectNulls
          withLegend={false}
          withDots={false}
          activeDotProps={{ r: 4, strokeWidth: 2 }}
          gridAxis='none'
          tickLine='none'
          strokeWidth={2}
          series={[
            {
              name: 'uploads',
              label: 'Uploads',
              color: 'var(--mantine-primary-color-filled)',
            },
            {
              name: 'logins',
              label: 'Logins',
              color: 'gray.5',
            },
          ]}
          xAxisProps={{
            tickMargin: 12,
            minTickGap: 32,
            tickFormatter: (v) => formatDayLabel(v),
          }}
          yAxisProps={{
            width: 36,
            tickMargin: 8,
          }}
          tooltipProps={{
            content: ({ label, payload }) => (
              <ChartTooltip
                label={formatDayLabel(label) || '—'}
                payload={payload}
                series={[
                  { name: 'uploads', label: 'Uploads', color: 'var(--mantine-primary-color-filled)' },
                  { name: 'logins', label: 'Logins', color: 'gray.5' },
                ]}
              />
            ),
          }}
        />
      )}
    </Paper>
  );
}
