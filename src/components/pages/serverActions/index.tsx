import { Group, Paper, Stack, Text, Title } from '@mantine/core';
import { useUserStore } from '@/lib/client/store/user';
import ClearTempButton from './actions/ClearTempButton';
import ClearZerosButton from './actions/ClearZerosButton';
import GenThumbsButton from './actions/GenThumbsButton';
import ImportExport from './actions/ImportExportButton';
import RequerySizeButton from './actions/RequerySizeButton';

const ACTIONS = [
  {
    name: 'Import/Export Data',
    desc: 'Allows you to import or export server data and configurations.',
    Component: ImportExport,
    superAdminOnly: true,
  },
  {
    name: 'Clear Temporary Files',
    desc: 'Removes all temporary files from the temporary directory.',
    Component: ClearTempButton,
  },
  {
    name: 'Clear Zero Byte Files',
    desc: 'Deletes all files with zero bytes from the database and/or storage.',
    Component: ClearZerosButton,
  },
  {
    name: 'Requery File Sizes',
    desc: 'Recalculates and updates the sizes of all files in the database.',
    Component: RequerySizeButton,
  },
  {
    name: 'Generate Thumbnails',
    desc: 'Creates thumbnails for all image and video files that lack them.',
    Component: GenThumbsButton,
  },
];

export default function DashboardServerActions() {
  const user = useUserStore((state) => state.user);
  const actions = ACTIONS.filter((action) => !action.superAdminOnly || user?.role === 'SUPERADMIN');

  return (
    <>
      <Group gap='sm'>
        <Title order={1}>Server Actions</Title>
      </Group>
      <Text c='dimmed' mb='xs'>
        Useful tools and scripts for server management.
      </Text>
      <Stack gap='xs' my='sm'>
        {actions.map(({ name, desc, Component }) => (
          <Paper withBorder p='sm' key={name}>
            <Group gap='md'>
              <Component />

              <div>
                <Title order={4}>{name}</Title>
                <Text c='dimmed'>{desc}</Text>
              </div>
            </Group>
          </Paper>
        ))}
      </Stack>
    </>
  );
}
