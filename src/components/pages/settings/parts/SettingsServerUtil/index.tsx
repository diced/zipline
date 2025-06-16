import { Group, Paper, Text, Title } from '@mantine/core';
import ClearTempButton from './ClearTempButton';
import ClearZerosButton from './ClearZerosButton';
import GenThumbsButton from './GenThumbsButton';
import RequerySizeButton from './RequerySizeButton';
import ImportButton from './ImportButton';
import ResetAllFilesButton from './ResetAllFilesButton';

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
        <GenThumbsButton />
        <ImportButton />
        <ResetAllFilesButton />
      </Group>
    </Paper>
  );
}
