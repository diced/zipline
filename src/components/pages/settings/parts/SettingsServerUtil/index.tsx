import { Group, Paper, Text, Title } from '@mantine/core';
import ClearZerosButton from './ClearZerosButton';
import ClearTempButton from './ClearTempButton';
import RequerySizeButton from './RequerySizeButton';

export default function SettingsServerActions() {
  return (
    <Paper withBorder p='sm'>
      <Title order={2}>Server Actions</Title>
      <Text size='sm' c='dimmed' mt={3}>
        Helpful scripts and tools for server management.
      </Text>

      <Group mt='xs'>
        <ClearZerosButton />
        <ClearTempButton />
        <RequerySizeButton />
      </Group>
    </Paper>
  );
}
