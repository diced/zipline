import { Response } from '@/lib/api/response';
import { IncompleteFile } from '@/lib/db/models/incompleteFile';
import { fetchApi } from '@/lib/fetchApi';
import { IncompleteFileStatus } from '@/prisma/client';
import { Badge, Button, Card, Group, Modal, Paper, Stack, Text } from '@mantine/core';
import { showNotification } from '@mantine/notifications';
import { IconFileDots, IconTrashFilled } from '@tabler/icons-react';
import { ReactNode } from 'react';
import useSWR from 'swr';
import { DashboardFilesModals, DashboardFilesModalsUpdate } from '.';

const badgeMap: Record<IncompleteFileStatus, ReactNode> = {
  PENDING: (
    <Badge variant='light' color='gray'>
      Pending
    </Badge>
  ),
  PROCESSING: (
    <Badge variant='light' color='yellow'>
      Processing
    </Badge>
  ),
  COMPLETE: (
    <Badge variant='light' color='green'>
      Complete
    </Badge>
  ),
  FAILED: (
    <Badge variant='light' color='red'>
      Failed
    </Badge>
  ),
};

export default function PendingFilesModal({
  modals,
  setModals,
}: {
  modals: DashboardFilesModals;
  setModals: DashboardFilesModalsUpdate;
}) {
  const { data: incompleteFiles, mutate } = useSWR<
    Extract<IncompleteFile[], Response['/api/user/files/incomplete']>
  >('/api/user/files/incomplete');

  const handleDelete = async (incompleteFile: IncompleteFile) => {
    const { error } = await fetchApi<Response['/api/user/files/incomplete']>(
      '/api/user/files/incomplete',
      'DELETE',
      {
        id: [incompleteFile.id],
      },
    );

    if (error) {
      showNotification({
        title: 'Error',
        message: `Failed to delete pending file: ${error.error}`,
        color: 'red',
        icon: <IconFileDots size='1rem' />,
      });
    } else {
      showNotification({
        message: 'Cleared Pending File!',
        color: 'green',
        icon: <IconTrashFilled size='1rem' />,
      });
    }

    mutate();
  };

  return (
    <Modal opened={modals.pending} onClose={() => setModals({ pending: false })} title='Pending Files'>
      <Stack gap='xs'>
        {incompleteFiles?.map((incompleteFile) => (
          <Card key={incompleteFile.id} withBorder>
            <Group justify='space-between'>
              <Text fw='bolder'>{incompleteFile.metadata.file.filename}</Text>
              {badgeMap[incompleteFile.status]}
            </Group>

            <Group justify='space-between'>
              <Text size='xs' c='dimmed' fw='bold'>
                {incompleteFile.metadata.file.type}
              </Text>

              <Text size='xs' c='dimmed'>
                {incompleteFile.chunksComplete} / {incompleteFile.chunksTotal} processed
              </Text>
            </Group>

            <Text size='xs' c='dimmed'>
              {incompleteFile.id}
            </Text>

            <Group justify='space-between'>
              <Button
                fullWidth
                size='compact-sm'
                mt='xs'
                color='red'
                variant='light'
                onClick={() => handleDelete(incompleteFile)}
                leftSection={<IconTrashFilled size='1rem' />}
              >
                Clear
              </Button>
            </Group>
          </Card>
        ))}

        {incompleteFiles?.length === 0 && (
          <Paper withBorder px='sm' py='xs'>
            No pending files
          </Paper>
        )}
      </Stack>
    </Modal>
  );
}
