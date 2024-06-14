import { Response } from '@/lib/api/response';
import { IncompleteFile } from '@/lib/db/models/incompleteFile';
import { fetchApi } from '@/lib/fetchApi';
import { ActionIcon, Badge, Button, Card, Group, Modal, Stack, Text, Title, Tooltip } from '@mantine/core';
import { showNotification } from '@mantine/notifications';
import { IncompleteFileStatus } from '@prisma/client';
import { IconFileDots, IconTrashFilled } from '@tabler/icons-react';
import { useRouter } from 'next/router';
import { ReactNode, useEffect, useState } from 'react';
import useSWR from 'swr';

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

export default function PendingFilesButton() {
  const router = useRouter();

  const [open, setOpen] = useState(router.query.pending !== undefined);

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
        message: `Failed to delete pending file: ${error.message}`,
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

  useEffect(() => {
    if (open) {
      router.push({ query: { ...router.query, pending: 'true' } }, undefined, { shallow: true });
    } else {
      delete router.query.pending;
      router.push({ query: router.query }, undefined, { shallow: true });
    }
  }, [open]);

  return (
    <>
      <Modal opened={open} onClose={() => setOpen(false)} title={<Title>Pending Files</Title>}>
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

          {incompleteFiles?.length === 0 && <Text>Nothing here!</Text>}
        </Stack>
      </Modal>

      <Tooltip label='View pending files'>
        <ActionIcon variant='outline' onClick={() => setOpen(true)}>
          <IconFileDots size='1rem' />
        </ActionIcon>
      </Tooltip>
    </>
  );
}
