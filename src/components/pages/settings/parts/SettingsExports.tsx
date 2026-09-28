import RelativeDate from '@/components/RelativeDate';
import { Response } from '@/lib/api/response';
import { bytes } from '@/lib/bytes';
import { ActionIcon, Button, Group, Paper, ScrollArea, Table, Text, Title, Tooltip } from '@mantine/core';
import { modals } from '@mantine/modals';
import { showNotification } from '@mantine/notifications';
import { IconDownload, IconPlus, IconTrashFilled } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import useSWR from 'swr';

export default function SettingsExports() {
  const { t } = useTranslation(['settings', 'common']);
  const { data, isLoading, mutate } = useSWR<Response['/api/user/export']>('/api/user/export', {
    refreshInterval: 5000,
  });

  const handleNewExport = async () => {
    modals.openConfirmModal({
      title: t('exports.modals.new.title'),
      children: t('exports.modals.new.message'),
      onConfirm: async () => {
        await fetch('/api/user/export', {
          method: 'POST',
        });

        showNotification({
          title: t('exports.notifications.started.title'),
          message: t('exports.notifications.started.message'),
          color: 'blue',
          loading: true,
        });
        mutate();
      },
      labels: {
        cancel: t('common:actions.cancel'),
        confirm: t('exports.modals.new.confirm'),
      },
    });
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/user/export?id=${id}`, {
      method: 'DELETE',
    });

    showNotification({
      message: t('exports.notifications.deleted.message'),
      color: 'red',
    });

    mutate();
  };

  return (
    <Paper withBorder p='sm'>
      <Title order={2}>{t('exports.title')}</Title>

      <Button
        mt='sm'
        fullWidth
        disabled={isLoading}
        onClick={handleNewExport}
        leftSection={<IconPlus size='1rem' />}
      >
        {t('exports.new')}
      </Button>

      {data?.length === 0 ? (
        <Paper p='sm' mt='sm' withBorder>
          {t('exports.empty')}
        </Paper>
      ) : (
        <ScrollArea.Autosize mah={500} type='auto'>
          <Paper withBorder p={0} mt='sm'>
            <Table highlightOnHover stickyHeader>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>{t('exports.table.id')}</Table.Th>
                  <Table.Th>{t('exports.table.started')}</Table.Th>
                  <Table.Th>{t('exports.table.files')}</Table.Th>
                  <Table.Th>{t('exports.table.size')}</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {data?.map((exportDb) => (
                  <Table.Tr key={exportDb.id}>
                    <Table.Td maw={140}>
                      <Tooltip
                        label={
                          exportDb.completed
                            ? t('exports.table.completed', { id: exportDb.id })
                            : t('exports.table.inProgress', { id: exportDb.id })
                        }
                      >
                        <Text
                          style={{ textOverflow: 'ellipsis', overflow: 'hidden' }}
                          c={exportDb.completed ? 'green' : 'dimmed'}
                        >
                          {exportDb.id}
                        </Text>
                      </Tooltip>
                    </Table.Td>
                    <Table.Td>
                      <RelativeDate date={new Date(exportDb.createdAt)} />
                    </Table.Td>
                    <Table.Td>{exportDb.files}</Table.Td>
                    <Table.Td>{exportDb.completed ? bytes(Number(exportDb.size)) : ''}</Table.Td>
                    <Table.Td w={95}>
                      <Group>
                        <ActionIcon onClick={() => handleDelete(exportDb.id)}>
                          <IconTrashFilled size='1rem' />
                        </ActionIcon>

                        <ActionIcon
                          component={Link}
                          target='_blank'
                          to={`/api/user/export?id=${exportDb.id}`}
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
          </Paper>
        </ScrollArea.Autosize>
      )}
    </Paper>
  );
}
