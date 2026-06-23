import { bytes } from '@/lib/bytes';
import { MetricsPoint } from '@/lib/metrics';
import { Group, Paper, rgba, SimpleGrid, Skeleton, Text } from '@mantine/core';
import {
  IconArrowDown,
  IconArrowUp,
  IconDatabase,
  IconEyeFilled,
  IconFiles,
  IconLink,
  IconUsers,
  Icon as TablerIcon,
} from '@tabler/icons-react';
import { percentChange } from '../statsHelpers';

function StatCard({
  title,
  first,
  last,
  formatter,
  Icon,
}: {
  title: string;
  first: number | bigint;
  last: number | bigint;
  Icon: TablerIcon;
  formatter?: (value: number) => string;
}) {
  const [color, percentStr] = percentChange(last, first);

  const ChangeIcon = {
    green: IconArrowUp,
    red: IconArrowDown,
    gray: null,
  }[color];

  return (
    <Paper radius='md' withBorder p='sm'>
      <Group justify='space-between'>
        <Text size='xl' fw={900}>
          {title}
        </Text>

        <Icon size='1.2rem' />
      </Group>

      <Group justify='flex-start' gap='xs'>
        <Text size='lg' fw={600}>
          {formatter ? formatter(Number(first)) : first}
        </Text>

        <Paper
          c={color}
          py={2}
          pl={5}
          pr={8}
          display='flex'
          bg={rgba(`var(--mantine-color-${color}-6)`, 0.25)}
        >
          <Group gap={2} align='center'>
            {ChangeIcon && <ChangeIcon size={20} stroke={1.5} />}
            <Text c={color} fz='sm' fw={500}>
              {percentStr}
            </Text>
          </Group>
        </Paper>
      </Group>
    </Paper>
  );
}

export function StatsCardsSkeleton() {
  return (
    <SimpleGrid
      cols={{
        base: 1,
        md: 2,
        lg: 3,
      }}
      mb='sm'
    >
      {[...Array(6)].map((_, i) => (
        <Skeleton key={i} height={100} animate />
      ))}
    </SimpleGrid>
  );
}

export default function StatsCards({ points }: { points: MetricsPoint[] }) {
  if (!points.length) return null;

  const recent = points[0];
  const last = points[points.length - 1];

  return (
    <SimpleGrid
      cols={{
        base: 1,
        md: 2,
        lg: 3,
      }}
      mb='sm'
    >
      <StatCard title='Files' first={recent.files} last={last.files} Icon={IconFiles} />
      <StatCard title='URLs' first={recent.urls} last={last.urls} Icon={IconLink} />
      <StatCard
        title='Storage Used'
        first={recent.storage}
        last={last.storage}
        formatter={bytes}
        Icon={IconDatabase}
      />
      <StatCard title='Users' first={recent.users} last={last.users} Icon={IconUsers} />
      <StatCard title='File Views' first={recent.fileViews} last={last.fileViews} Icon={IconEyeFilled} />
      <StatCard title='URL Views' first={recent.urlViews} last={last.urlViews} Icon={IconEyeFilled} />
    </SimpleGrid>
  );
}
