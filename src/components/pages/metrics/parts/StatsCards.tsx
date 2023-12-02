import { bytes } from '@/lib/bytes';
import { Metric } from '@/lib/db/models/metric';
import { Group, Paper, SimpleGrid, Text, Title } from '@mantine/core';
import {
  IconDatabase,
  IconEyeFilled,
  IconFiles,
  IconLink,
  IconUsers,
  Icon as TablerIcon,
} from '@tabler/icons-react';

function StatCard({ title, value, Icon }: { title: string; value: number | string; Icon: TablerIcon }) {
  return (
    <Paper radius='sm' withBorder p='sm'>
      <Group justify='space-between'>
        <Text size='xl' fw='bolder'>
          {title}
        </Text>

        <Icon size='1.2rem' />
      </Group>

      <Title order={1}>{value}</Title>
    </Paper>
  );
}

export default function StatsCards({ data }: { data: Metric[] }) {
  if (!data.length) return null;
  const recent = data[0];

  return (
    <SimpleGrid
      cols={{
        base: 1,
        md: 2,
        lg: 3,
      }}
      mb='sm'
    >
      <StatCard title='Files' value={recent.data.files} Icon={IconFiles} />
      <StatCard title='URLs' value={recent.data.urls} Icon={IconLink} />
      <StatCard title='Storage Used' value={bytes(recent.data.storage)} Icon={IconDatabase} />
      <StatCard title='Users' value={recent.data.users} Icon={IconUsers} />
      <StatCard title='File Views' value={recent.data.fileViews} Icon={IconEyeFilled} />
      <StatCard title='URL Views' value={recent.data.urlViews} Icon={IconEyeFilled} />
    </SimpleGrid>
  );
}
