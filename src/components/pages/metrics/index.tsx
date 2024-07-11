import { Box, Button, Group, Loader, Modal, Paper, SimpleGrid, Text, Title, Tooltip } from '@mantine/core';
import { DatePicker } from '@mantine/dates';
import { IconCalendarSearch, IconCalendarTime } from '@tabler/icons-react';
import { useState } from 'react';
import FilesUrlsCountGraph from './parts/FilesUrlsCountGraph';
import StatsCards from './parts/StatsCards';
import StatsTables from './parts/StatsTables';
import StorageGraph from './parts/StorageGraph';
import ViewsGraph from './parts/ViewsGraph';
import { useApiStats } from './useStats';

export default function DashboardMetrics() {
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([
    new Date(Date.now() - 86400000 * 7),
    new Date(),
  ]);
  const [open, setOpen] = useState(false);
  const [allTime, setAllTime] = useState(false);

  const { data, isLoading } = useApiStats({
    from: dateRange[0]?.toISOString() ?? undefined,
    to: dateRange[1]?.toISOString() ?? undefined,
    all: allTime,
  });

  return (
    <>
      <Modal title={<Title>Change Range</Title>} opened={open} onClose={() => setOpen(false)} size='auto'>
        <Paper withBorder>
          <DatePicker
            type='range'
            value={dateRange}
            onChange={(value) => {
              setDateRange(value);
              setAllTime(false);
            }}
            allowSingleDateInRange={false}
            maxDate={new Date(Date.now() + 0)}
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
          leftSection={<IconCalendarSearch size='1rem' />}
          onClick={() => setOpen(true)}
        >
          Change Date Range
        </Button>
        {!allTime ? (
          <Text size='sm' c='dimmed'>
            {data?.length ? (
              <>
                {new Date(data?.[data.length - 1]?.createdAt).toLocaleDateString()}
                {' to '}
                {new Date(data?.[0]?.createdAt).toLocaleDateString()}{' '}
              </>
            ) : (
              <>
                {dateRange[0]?.toLocaleDateString()}{' '}
                {dateRange[1] ? `to ${dateRange[1]?.toLocaleDateString()}` : ''}
              </>
            )}
          </Text>
        ) : (
          <Text size='sm' c='dimmed'>
            All Time
          </Text>
        )}
        <Tooltip label='This may take longer than usual to load.'>
          <Button
            size='compact-sm'
            variant='outline'
            leftSection={<IconCalendarTime size='1rem' />}
            onClick={() => setAllTime(true)}
          >
            Show All Time
          </Button>
        </Tooltip>
      </Group>

      <Box pos='relative' mih={300} my='sm'>
        {isLoading ? (
          <Loader />
        ) : data?.length ? (
          <div>
            <StatsCards data={data!} />

            <StatsTables data={data!} />

            <SimpleGrid mt='md' cols={{ base: 1, md: 2 }}>
              <FilesUrlsCountGraph metrics={data!} />
              <ViewsGraph metrics={data!} />
            </SimpleGrid>

            <div>
              <StorageGraph metrics={data!} />
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
