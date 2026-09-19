import RelativeDate from '@/components/RelativeDate';
import { Response } from '@/lib/api/response';
import { IncompleteFileStatus } from '@/lib/db/enums';
import { IncompleteFile } from '@/lib/db/models/incompleteFile';
import { fetchApi } from '@/lib/fetchApi';
import {
  ActionIcon,
  Badge,
  Button,
  Group,
  Modal,
  Paper,
  ScrollArea,
  Stack,
  Text,
  Tooltip,
} from '@mantine/core';
import { showNotification } from '@mantine/notifications';
import { IconFileDots, IconTrashFilled } from '@tabler/icons-react';
import { ReactNode, useState } from 'react';
import useSWR from 'swr';
import { DashboardFilesModals, DashboardFilesModalsUpdate } from '.';

const badgeMap: Record<IncompleteFileStatus, ReactNode> = {
  PENDING: (
    <Badge size='xs' variant='light' color='gray'>
      Pending
    </Badge>
  ),
  PROCESSING: (
    <Badge size='xs' variant='light' color='yellow'>
      Processing
    </Badge>
  ),
  COMPLETE: (
    <Badge size='xs' variant='light' color='green'>
      Complete
    </Badge>
  ),
  FAILED: (
    <Badge size='xs' variant='light' color='red'>
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
  const [clearing, setClearing] = useState(false);
  const { data: incompleteFiles, mutate } = useSWR<
    Extract<IncompleteFile[], Response['/api/user/files/incomplete']>
  >('/api/user/files/incomplete');

  const handleDelete = async (incompleteFile?: IncompleteFile) => {
    setClearing(true);
    try {
      const { error } = await fetchApi<Response['/api/user/files/incomplete']>(
        '/api/user/files/incomplete',
        'DELETE',
        incompleteFile ? { id: [incompleteFile.id] } : { completed: true },
      );

      if (error) throw new Error(error.error);

      showNotification({
        message: incompleteFile ? 'Cleared Pending File!' : 'Cleared completed files!',
        color: 'green',
        icon: <IconTrashFilled size='1rem' />,
      });
      await mutate();
    } catch (error) {
      showNotification({
        title: 'Error',
        message: `Failed to clear ${incompleteFile ? 'pending file' : 'completed files'}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        color: 'red',
        icon: <IconFileDots size='1rem' />,
      });
    } finally {
      setClearing(false);
    }
  };

  return (
    <Modal
      opened={modals.pending}
      onClose={() => setModals({ pending: false })}
      title='Pending Files'
      size='md'
    >
      <Stack gap='xs'>
        <Group justify='space-between'>
          <Text size='sm' c='dimmed'>
            {incompleteFiles?.length ?? 0} file{incompleteFiles?.length === 1 ? '' : 's'}
          </Text>
          <Button
            size='compact-sm'
            color='red'
            variant='light'
            disabled={clearing || !incompleteFiles?.some((file) => file.status === 'COMPLETE')}
            onClick={() => handleDelete()}
            leftSection={<IconTrashFilled size='1rem' />}
          >
            Clear completed
          </Button>
        </Group>
        {!!incompleteFiles?.length && (
          <ScrollArea.Autosize mah={400} type='auto'>
            <Stack gap='xs'>
              {incompleteFiles.map((inf) => (
                <Group key={inf.id} justify='space-between' wrap='nowrap' gap='sm'>
                  <Stack gap={2} flex={1} miw={0}>
                    <Text size='sm' fw={600} truncate title={inf.metadata.file.filename}>
                      {inf.metadata.file.filename}
                    </Text>

                    <Text size='xs' c='dimmed'>
                      {inf.chunksComplete}/{inf.chunksTotal} chunks
                      {inf.status === 'COMPLETE' && (
                        <>
                          , <RelativeDate date={inf.updatedAt} />
                        </>
                      )}
                    </Text>
                  </Stack>

                  <Group gap='xs' wrap='nowrap'>
                    {badgeMap[inf.status]}

                    <Tooltip label='Clear entry'>
                      <ActionIcon
                        color='red'
                        variant='outline'
                        aria-label={`Clear ${inf.metadata.file.filename}`}
                        disabled={clearing}
                        onClick={() => handleDelete(inf)}
                      >
                        <IconTrashFilled size='1rem' />
                      </ActionIcon>
                    </Tooltip>
                  </Group>
                </Group>
              ))}
            </Stack>
          </ScrollArea.Autosize>
        )}

        {incompleteFiles?.length === 0 && (
          <Paper withBorder px='sm' py='xs'>
            No pending files
          </Paper>
        )}
      </Stack>
    </Modal>
  );
}
