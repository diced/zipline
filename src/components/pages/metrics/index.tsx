import { Box, Button, Group, Loader, Modal, Paper, SimpleGrid, Text, Title } from '@mantine/core';
import { DatePicker } from '@mantine/dates';
import { IconCalendarTime } from '@tabler/icons-react';
import { useState } from 'react';
import FilesUrlsCountGraph from './parts/FilesUrlsCountGraph';
import StatsCards from './parts/StatsCards';
import StatsTables from './parts/StatsTables';
import StorageGraph from './parts/StorageGraph';
import ViewsGraph from './parts/ViewsGraph';
import { useApiStats } from './useStats';

export default function DashboardMetrics() {
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([
    new Date(Date.now() - 86400000),
    new Date(),
  ]);
  const [open, setOpen] = useState(false);

  const { data, isLoading } = useApiStats({
    from: dateRange[0]?.toISOString() ?? undefined,
    to: dateRange[1]?.toISOString() ?? undefined,
  });

  return (
    <>
      <Modal title={<Title>Change Range</Title>} opened={open} onClose={() => setOpen(false)} size='auto'>
        <Paper withBorder>
          <DatePicker
            type='range'
            value={dateRange}
            onChange={setDateRange}
            allowSingleDateInRange={false}
            maxDate={new Date(Date.now() + 86400000)}
          />
        </Paper>

        <Group mt='md'>
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
          leftSection={<IconCalendarTime size='1rem' />}
          onClick={() => setOpen(true)}
        >
          Change Date Range
        </Button>

        <Text size='sm' c='dimmed'>
          {dateRange[0]?.toLocaleDateString()}{' '}
          {dateRange[1] ? `to ${dateRange[1]?.toLocaleDateString()}` : ''}
        </Text>
      </Group>

      <Box pos='relative' mih={300} my='sm'>
        {isLoading ? (
          <Loader />
        ) : data ? (
          <div>
            <StatsCards data={data!} />

            <StatsTables data={data!} />

            <SimpleGrid mt='md' cols={{ base: 1, md: 2 }}>
              <FilesUrlsCountGraph metrics={data!} />
              <ViewsGraph metrics={data!} />
            </SimpleGrid>

            {/* :skull: this stops it from overflowing somehow */}
            <SimpleGrid cols={1}>
              <StorageGraph metrics={data!} />
            </SimpleGrid>
          </div>
        ) : (
          <Text size='sm' c='red'>
            Failed to load statistics for this time range.
          </Text>
        )}
      </Box>
    </>
  );
}
