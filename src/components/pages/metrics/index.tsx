import { Box, Button, Group, Modal, Paper, SimpleGrid, Text, Title, Tooltip } from '@mantine/core';
import { DatePicker } from '@mantine/dates';
import { IconCalendarSearch, IconCalendarTime } from '@tabler/icons-react';
import dayjs from 'dayjs';
import { lazy, useState } from 'react';
import { StatsCardsSkeleton } from './parts/StatsCards';
import { StatsTablesSkeleton } from './parts/StatsTables';
import { useApiStats } from './useStats';

const FilesUrlsCountGraph = lazy(() => import('./parts/FilesUrlsCountGraph'));
const StorageGraph = lazy(() => import('./parts/StorageGraph'));
const ViewsGraph = lazy(() => import('./parts/ViewsGraph'));
const StatsCards = lazy(() => import('./parts/StatsCards'));
const StatsTables = lazy(() => import('./parts/StatsTables'));

export default function DashboardMetrics() {
  const today = dayjs();

  const [dateRange, setDateRange] = useState<[string | null, string | null]>([
    today.subtract(7, 'day').toISOString(),
    today.toISOString(),
  ]);

  const [open, setOpen] = useState(false);
  const [allTime, setAllTime] = useState(false);

  const { data, isLoading } = useApiStats({
    from: allTime || !dateRange[0] ? undefined : new Date(dateRange[0]).toISOString(),
    to: allTime || !dateRange[1] ? undefined : new Date(dateRange[1]).toISOString(),
    all: allTime,
  });

  const handleDateChange = (value: [string | null, string | null]) => {
    setAllTime(false);
    setDateRange(value);
  };

  const showAllTime = () => {
    setAllTime(true);
    setDateRange([null, null]);
  };

  return (
    <>
      <Modal title='Change range' opened={open} onClose={() => setOpen(false)} size='auto'>
        <Paper withBorder style={{ minHeight: 300 }}>
          <DatePicker
            type='range'
            value={dateRange}
            onChange={handleDateChange}
            allowSingleDateInRange={false}
            maxDate={new Date()}
            presets={[
              {
                value: [today.subtract(2, 'day').format('YYYY-MM-DD'), today.format('YYYY-MM-DD')],
                label: 'Last two days',
              },
              {
                value: [today.subtract(7, 'day').format('YYYY-MM-DD'), today.format('YYYY-MM-DD')],
                label: 'Last 7 days',
              },
              {
                value: [today.startOf('month').format('YYYY-MM-DD'), today.format('YYYY-MM-DD')],
                label: 'This month',
              },
              {
                value: [
                  today.subtract(1, 'month').startOf('month').format('YYYY-MM-DD'),
                  today.subtract(1, 'month').endOf('month').format('YYYY-MM-DD'),
                ],
                label: 'Last month',
              },
              {
                value: [today.startOf('year').format('YYYY-MM-DD'), today.format('YYYY-MM-DD')],
                label: 'This year',
              },
              {
                value: [
                  today.subtract(1, 'year').startOf('year').format('YYYY-MM-DD'),
                  today.subtract(1, 'year').endOf('year').format('YYYY-MM-DD'),
                ],
                label: 'Last year',
              },
            ]}
          />
        </Paper>

        <Group mt='lg'>
          <Button fullWidth onClick={() => setOpen(false)}>
            Close
          </Button>
        </Group>
      </Modal>

      <Group>
        <Title>Metrics</Title>
        <Button
          size='compact-sm'
          variant='outline'
          leftSection={<IconCalendarSearch size='1rem' />}
          onClick={() => setOpen(true)}
        >
          Change Date Range
        </Button>
        {!allTime ? (
          <Text size='sm' c='dimmed'>
            {dateRange[0] ? new Date(dateRange[0]).toLocaleDateString() : '—'}
            {dateRange[1] ? ` to ${new Date(dateRange[1]).toLocaleDateString()}` : ''}
          </Text>
        ) : (
          <Text size='sm' c='dimmed'>
            All Time
          </Text>
        )}
        <Tooltip
          label={!allTime ? 'This may take longer than usual to load.' : 'You are viewing all time stats.'}
        >
          <Button
            size='compact-sm'
            variant='outline'
            leftSection={<IconCalendarTime size='1rem' />}
            onClick={() => showAllTime()}
            disabled={allTime}
          >
            Show All Time
          </Button>
        </Tooltip>
      </Group>

      <Box pos='relative' mih={300} my='sm'>
        {isLoading ? (
          <div>
            <StatsCardsSkeleton />
            <StatsTablesSkeleton />
          </div>
        ) : data?.points.length ? (
          <div>
            <StatsCards points={data.points} />
            <StatsTables latest={data.latest} />
            <SimpleGrid mt='md' cols={{ base: 1, md: 2 }}>
              <FilesUrlsCountGraph points={data.points} />
              <ViewsGraph points={data.points} />
            </SimpleGrid>
            <div>
              <StorageGraph points={data.points} />
            </div>
          </div>
        ) : (
          <Text size='sm' c='red'>
            Failed to load statistics for this time range. There may be no data available within the time
            range specified. :(
          </Text>
        )}
      </Box>
    </>
  );
}
