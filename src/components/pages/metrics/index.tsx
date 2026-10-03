import { Box, Button, Group, Modal, Paper, SimpleGrid, Text, Title, Tooltip } from '@mantine/core';
import { DatePicker } from '@mantine/dates';
import { IconCalendarSearch, IconCalendarTime } from '@tabler/icons-react';
import dayjs from 'dayjs';
import { lazy, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StatsCardsSkeleton, StatsTablesSkeleton } from './parts/Skeletons';
import { useApiStats } from './useStats';

const FilesUrlsCountGraph = lazy(() => import('./parts/FilesUrlsCountGraph'));
const StorageGraph = lazy(() => import('./parts/StorageGraph'));
const ViewsGraph = lazy(() => import('./parts/ViewsGraph'));
const StatsCards = lazy(() => import('./parts/StatsCards'));
const StatsTables = lazy(() => import('./parts/StatsTables'));

export default function DashboardMetrics() {
  const { t } = useTranslation(['metrics', 'common']);
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
      <Modal title={t('range.modalTitle')} opened={open} onClose={() => setOpen(false)} size='auto'>
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
                label: t('range.presets.lastTwoDays'),
              },
              {
                value: [today.subtract(7, 'day').format('YYYY-MM-DD'), today.format('YYYY-MM-DD')],
                label: t('range.presets.last7Days'),
              },
              {
                value: [today.startOf('month').format('YYYY-MM-DD'), today.format('YYYY-MM-DD')],
                label: t('range.presets.thisMonth'),
              },
              {
                value: [
                  today.subtract(1, 'month').startOf('month').format('YYYY-MM-DD'),
                  today.subtract(1, 'month').endOf('month').format('YYYY-MM-DD'),
                ],
                label: t('range.presets.lastMonth'),
              },
              {
                value: [today.startOf('year').format('YYYY-MM-DD'), today.format('YYYY-MM-DD')],
                label: t('range.presets.thisYear'),
              },
              {
                value: [
                  today.subtract(1, 'year').startOf('year').format('YYYY-MM-DD'),
                  today.subtract(1, 'year').endOf('year').format('YYYY-MM-DD'),
                ],
                label: t('range.presets.lastYear'),
              },
            ]}
          />
        </Paper>

        <Group mt='lg'>
          <Button fullWidth onClick={() => setOpen(false)}>
            {t('common:actions.close')}
          </Button>
        </Group>
      </Modal>

      <Group>
        <Title>{t('title')}</Title>
        <Button
          size='compact-sm'
          variant='outline'
          leftSection={<IconCalendarSearch size='1rem' />}
          onClick={() => setOpen(true)}
        >
          {t('range.change')}
        </Button>
        {!allTime ? (
          <Text size='sm' c='dimmed'>
            {dateRange[1]
              ? t('range.fromTo', {
                  from: dateRange[0] ? new Date(dateRange[0]).toLocaleDateString() : '—',
                  to: new Date(dateRange[1]).toLocaleDateString(),
                })
              : dateRange[0]
                ? new Date(dateRange[0]).toLocaleDateString()
                : '—'}
          </Text>
        ) : (
          <Text size='sm' c='dimmed'>
            {t('allTime.label')}
          </Text>
        )}
        <Tooltip label={!allTime ? t('allTime.slowWarning') : t('allTime.viewing')}>
          <Button
            size='compact-sm'
            variant='outline'
            leftSection={<IconCalendarTime size='1rem' />}
            onClick={() => showAllTime()}
            disabled={allTime}
          >
            {t('allTime.show')}
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
            {t('loadFailed')}
          </Text>
        )}
      </Box>
    </>
  );
}
