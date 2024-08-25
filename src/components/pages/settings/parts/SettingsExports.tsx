import { Response } from '@/lib/api/response';
import { ActionIcon, Button, Paper, ScrollArea, Table, Title } from '@mantine/core';
import { modals } from '@mantine/modals';
import { showNotification } from '@mantine/notifications';
import { IconPlus, IconTrashFilled } from '@tabler/icons-react';
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

  const handleDelete = async (name: string) => {
    await fetch(`/api/user/export?name=${name}`, {
      method: 'DELETE',
    });

    showNotification({
      title: 'Export deleted',
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
        Completed Exports
      </Title>
      <ScrollArea.Autosize mah={500} type='auto'>
        <Table highlightOnHover stickyHeader>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Name</Table.Th>
              <Table.Th>Started On</Table.Th>
              <Table.Th>Files</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {isLoading && <Table.Tr>Loading...</Table.Tr>}
            {data?.complete.map((file) => (
              <Table.Tr key={file.name}>
                <Table.Td>{file.name}</Table.Td>
                <Table.Td>{new Date(file.date).toLocaleString()}</Table.Td>
                <Table.Td>{file.files}</Table.Td>
                <Table.Td>
                  <ActionIcon onClick={() => handleDelete(file.name)}>
                    <IconTrashFilled size='1rem' />
                  </ActionIcon>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </ScrollArea.Autosize>

      <Title order={4} mt='sm'>
        Running Exports
      </Title>
      <ScrollArea.Autosize mah={500} type='auto'>
        <Table highlightOnHover stickyHeader>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Name</Table.Th>
              <Table.Th>Started On</Table.Th>
              <Table.Th>Files</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {isLoading && <Table.Tr>Loading...</Table.Tr>}
            {data?.running.map((file) => (
              <Table.Tr key={file.name}>
                <Table.Td>{file.name}</Table.Td>
                <Table.Td>{new Date(file.date).toLocaleString()}</Table.Td>
                <Table.Td>{file.files}</Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </ScrollArea.Autosize>
    </Paper>
  );
}
