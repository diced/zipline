import { Box, Group, Text, Button } from '@mantine/core';

interface BatchSizeSettingsProps {
  batchSize: number;
  onBatchSizeChange: (newSize: number) => void;
}

export function BatchSizeSettings({ batchSize, onBatchSizeChange }: BatchSizeSettingsProps) {
  return (
    <Box mt='md' pt='md' style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
      <Group justify='space-between' align='center'>
        <Group gap='xs'>
          <Text size='sm' c='dimmed'>Batch Upload Size:</Text>
          <Text size='sm' fw={600}>{batchSize} files per batch</Text>
        </Group>
        <Group gap='xs'>
          <Button
            variant='subtle'
            size='xs'
            onClick={() => onBatchSizeChange(Math.max(1, batchSize - 1))}
            disabled={batchSize <= 1}
          >
            -
          </Button>
          <Button
            variant='subtle'
            size='xs'
            onClick={() => onBatchSizeChange(Math.min(50, batchSize + 1))}
            disabled={batchSize >= 50}
          >
            +
          </Button>
          <Button
            variant='subtle'
            size='xs'
            onClick={() => onBatchSizeChange(5)}
          >
            Reset
          </Button>
        </Group>
      </Group>
      <Text size='xs' c='dimmed' mt='xs'>
        When uploading many files, they will be processed in batches of {batchSize}. Adjust between 1-50 files per batch.
      </Text>
    </Box>
  );
}
