import { Response } from '@/lib/api/response';
import { fetchApi } from '@/lib/fetchApi';
import { useLogout } from '@/lib/client/hooks/useLogout';
import { ActionIcon, Button, Modal, Paper, SimpleGrid, Skeleton, Table, Text, Title } from '@mantine/core';
import { modals } from '@mantine/modals';
import { showNotification } from '@mantine/notifications';
import { IconLogout, IconTrashFilled, IconUsers } from '@tabler/icons-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import useSWR from 'swr';

export default function SettingsSessions() {
  const { t } = useTranslation(['settings', 'common']);
  const logout = useLogout();

  const { data, isLoading, mutate } = useSWR<Response['/api/user/sessions']>('/api/user/sessions');

  const [open, setOpen] = useState(false);

  const handleLogOutOfAllDevices = async () => {
    modals.openConfirmModal({
      title: t('sessions.modals.logoutAll.title'),
      children: t('sessions.modals.logoutAll.message'),
      onConfirm: async () => {
        const { error } = await fetchApi('/api/user/sessions', 'DELETE', {
          all: true,
        });

        if (!error) {
          showNotification({
            message: t('sessions.notifications.loggedOutAll'),
            color: 'blue',
            icon: <IconLogout size='1rem' />,
          });
        }
        mutate();
      },
      labels: {
        cancel: t('common:actions.cancel'),
        confirm: t('sessions.modals.logoutAll.confirm'),
      },
    });
  };

  const handleLogOutOfDevice = async (sessionId: string) => {
    modals.openConfirmModal({
      title: t('sessions.modals.logoutDevice.title'),
      children: t('sessions.modals.logoutDevice.message'),
      onConfirm: async () => {
        const { error } = await fetchApi('/api/user/sessions', 'DELETE', {
          sessionId,
        });

        if (!error) {
          showNotification({
            message: t('sessions.notifications.loggedOutDevice'),
            color: 'blue',
            icon: <IconLogout size='1rem' />,
          });
        }
        mutate();
      },
      labels: {
        cancel: t('common:actions.cancel'),
        confirm: t('sessions.modals.logoutDevice.confirm'),
      },
    });
  };

  const tableRows = data?.other.map((element) => (
    <Table.Tr key={element.id}>
      <Table.Td>{element.client}</Table.Td>
      <Table.Td>{element.device}</Table.Td>
      <Table.Td>{new Date(element.createdAt).toLocaleString()}</Table.Td>
      <Table.Td>
        <ActionIcon color='red' onClick={() => handleLogOutOfDevice(element.id)}>
          <IconTrashFilled size='1rem' />
        </ActionIcon>
      </Table.Td>
    </Table.Tr>
  ));

  return (
    <>
      <Modal title={t('sessions.title')} opened={open} onClose={() => setOpen(false)} size='lg'>
        <Paper withBorder>
          {data?.other?.length ? (
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>{t('sessions.table.client')}</Table.Th>
                  <Table.Th>{t('sessions.table.device')}</Table.Th>
                  <Table.Th>{t('sessions.table.loggedInAt')}</Table.Th>
                  <Table.Th></Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>{tableRows}</Table.Tbody>
            </Table>
          ) : (
            <Text c='dimmed' p='md'>
              {t('sessions.empty')}
            </Text>
          )}
        </Paper>

        <Button
          fullWidth
          mt='sm'
          color='yellow'
          onClick={handleLogOutOfAllDevices}
          disabled={!data?.other?.length}
        >
          {t('sessions.logoutAll')}
        </Button>
      </Modal>

      <Paper withBorder p='sm'>
        <Title order={2}>{t('sessions.title')}</Title>

        <Skeleton visible={isLoading} animate mt='sm'>
          <Text c='dimmed'>
            {t('sessions.summary', {
              amount: isLoading ? '...' : (data?.other?.length ?? '...'),
            })}
          </Text>
        </Skeleton>

        <SimpleGrid
          cols={{
            xs: 1,
            sm: 2,
          }}
          mt='sm'
        >
          <Button
            onClick={() => setOpen(true)}
            disabled={isLoading || !data?.other?.length}
            leftSection={<IconUsers size='1rem' />}
          >
            {t('sessions.view')}
          </Button>

          <Button color='yellow' onClick={logout} leftSection={<IconLogout size='1rem' />}>
            {t('sessions.logoutBrowser')}
          </Button>
        </SimpleGrid>
      </Paper>
    </>
  );
}
