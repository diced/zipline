import { Response } from '@/lib/api/response';
import { bytes } from '@/lib/bytes';
import { Button, Group, Paper, Progress, Skeleton, Stack, Text, Title, Tooltip } from '@mantine/core';
import { IconDatabase, IconRefresh } from '@tabler/icons-react';
import useSWR from 'swr';

export function Storage() {
  const {
    data: status,
    isLoading,
    error,
    mutate,
  } = useSWR<Response['/api/server/status']>('/api/server/status');

  return (
    <Paper withBorder p='md' radius='md'>
      <Group justify='space-between' mb='sm'>
        <Group gap='xs'>
          <IconDatabase size='1.2rem' />
          <Title order={3}>Storage</Title>
        </Group>

        <Tooltip label='Refresh storage stats'>
          <Button variant='subtle' size='compact-sm' onClick={() => mutate()} loading={isLoading}>
            <IconRefresh size='1rem' />
          </Button>
        </Tooltip>
      </Group>

      {isLoading ? (
        <Stack gap='sm'>
          <Skeleton height={18} animate />
          <Skeleton height={28} animate />
          <Skeleton height={12} animate />
        </Stack>
      ) : error ? (
        <Text size='sm' c='red'>
          Failed to load storage
        </Text>
      ) : status ? (
        <Stack gap='sm'>
          <Text size='sm' c='dimmed'>
            {status.datasource === 's3' ? 'S3: ' : ''}
            {status.storage.path}
          </Text>

          {status.storage.total != null ? (
            <>
              <Progress.Root size='xl'>
                <Progress.Section
                  value={Math.min(100, (status.storage.used / status.storage.total) * 100)}
                  color={
                    status.storage.used / status.storage.total > 0.9
                      ? 'red'
                      : status.storage.used / status.storage.total > 0.75
                        ? 'orange'
                        : 'blue'
                  }
                >
                  <Progress.Label>
                    {Math.round((status.storage.used / status.storage.total) * 100)}%
                  </Progress.Label>
                </Progress.Section>
              </Progress.Root>

              <Text size='xs' c='dimmed' ta='right'>
                {bytes(status.storage.used)} / {bytes(status.storage.total)}
              </Text>
            </>
          ) : (
            <>
              <Text size='xs' c='dimmed'>
                {bytes(status.storage.used)} used
              </Text>
            </>
          )}
        </Stack>
      ) : null}
    </Paper>
  );
}
