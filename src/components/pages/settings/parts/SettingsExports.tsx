import { Response } from '@/lib/api/response';
import { bytes } from '@/lib/bytes';
import { ActionIcon, Button, Group, Paper, ScrollArea, Table, Title } from '@mantine/core';
import { modals } from '@mantine/modals';
import { showNotification } from '@mantine/notifications';
import { IconDownload, IconPlus, IconTrashFilled } from '@tabler/icons-react';
import Link from 'next/link';
import useSWR from 'swr';

export default function SettingsExports() {
  const { data, isLoading, mutate } = useSWR<Response['/api/user/export']>('/api/user/export', {
    refreshInterval: 5000,
  });

  const handleNewExport = async () => {
    modals.openConfirmModal({
      title: <Title>New Export?</Title>,
      children:
        'Are you sure you want to start a new export? If you have a lot of files, this may take a while.',
      onConfirm: async () => {
        await fetch('/api/user/export', {
          method: 'POST',
        });

        showNotification({
          title: 'Export started',
          message: 'Export has been started, you can check its status in the table below',
          color: 'blue',
          loading: true,
        });
        mutate();
      },
      labels: {
        cancel: 'Cancel',
        confirm: 'Start export',
      },
    });
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/user/export?id=${id}`, {
      method: 'DELETE',
    });

    showNotification({
      message: 'Export has been deleted',
      color: 'red',
    });

    mutate();
  };

  return (
    <Paper withBorder p='sm'>
      <Title order={2}>Export Files</Title>

      <Button
        mt='sm'
        fullWidth
        color='blue'
        disabled={isLoading}
        onClick={handleNewExport}
        leftSection={<IconPlus size='1rem' />}
      >
        New Export
      </Button>

      <Title order={4} mt='sm'>
        Exports
      </Title>
      <ScrollArea.Autosize mah={500} type='auto'>
        <Table highlightOnHover stickyHeader>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>ID</Table.Th>
              <Table.Th>Started On</Table.Th>
              <Table.Th>Files</Table.Th>
              <Table.Th>Size</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {isLoading && <Table.Tr>Loading...</Table.Tr>}
            {data?.map((exportDb) => (
              <Table.Tr key={exportDb.id}>
                <Table.Td>{exportDb.id}</Table.Td>
                <Table.Td>{new Date(exportDb.createdAt).toLocaleString()}</Table.Td>
                <Table.Td>{exportDb.files}</Table.Td>
                <Table.Td>{exportDb.completed ? bytes(Number(exportDb.size)) : ''}</Table.Td>
                <Table.Td>
                  <Group>
                    <ActionIcon onClick={() => handleDelete(exportDb.id)}>
                      <IconTrashFilled size='1rem' />
                    </ActionIcon>

                    <ActionIcon
                      component={Link}
                      target='_blank'
                      href={`/api/user/export?id=${exportDb.id}`}
                      disabled={!exportDb.completed}
                    >
                      <IconDownload size='1rem' />
                    </ActionIcon>
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </ScrollArea.Autosize>
    </Paper>
  );
}
