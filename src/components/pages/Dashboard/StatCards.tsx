import { SimpleGrid } from '@mantine/core';
import StatCard from 'components/StatCard';
import { useStats } from 'lib/queries/stats';
import { percentChange } from 'lib/utils/client';
import { EyeIcon, DatabaseIcon, UserIcon, FileIcon } from 'components/icons';

export function StatCards() {
  const stats = useStats();
  const latest = stats.data?.[0];
  const before = stats.data?.[1];

  return (
    <SimpleGrid
      cols={4}
      breakpoints={[
        { maxWidth: 'md', cols: 2 },
        { maxWidth: 'xs', cols: 1 },
      ]}
      my='sm'
    >
      <StatCard
        stat={{
          title: 'FILES',
          value: stats.isSuccess ? latest.data.count.toLocaleString() : '...',
          desc: 'files have been uploaded',
          icon: <FileIcon />,
          diff:
            stats.isSuccess && before?.data ? percentChange(before.data.count, latest.data.count) : undefined,
        }}
      />

      <StatCard
        stat={{
          title: 'STORAGE',
          value: stats.isSuccess ? latest.data.size : '...',
          desc: 'used',
          icon: <DatabaseIcon />,
          diff:
            stats.isSuccess && before?.data
              ? percentChange(before.data.size_num, latest.data.size_num)
              : undefined,
        }}
      />

      <StatCard
        stat={{
          title: 'VIEWS',
          value: stats.isSuccess ? latest.data.views_count.toLocaleString() : '...',
          desc: 'total file views',
          icon: <EyeIcon />,
          diff:
            stats.isSuccess && before?.data
              ? percentChange(before.data.views_count, latest.data.views_count)
              : undefined,
        }}
      />

      <StatCard
        stat={{
          title: 'USERS',
          value: stats.isSuccess ? latest.data.count_users.toLocaleString() : '...',
          desc: 'users',
          icon: <UserIcon />,
        }}
      />
    </SimpleGrid>
  );
}
