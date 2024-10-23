import { Response } from '@/lib/api/response';
import { fetchApi } from '@/lib/fetchApi';
import { Button, Paper, Text, Title } from '@mantine/core';
import { modals } from '@mantine/modals';
import { showNotification } from '@mantine/notifications';
import { IconLogout } from '@tabler/icons-react';
import useSWR from 'swr';

export default function SettingsSessions() {
  const { data, isLoading, mutate } = useSWR<Response['/api/user/sessions']>('/api/user/sessions');

  const handleLogOutOfAllDevices = async () => {
    modals.openConfirmModal({
      title: <Title>Log out of all devices</Title>,
      children:
        'Are you sure you want to log out of all devices? This will log you out of all devices except the current one.',
      onConfirm: async () => {
        const { error } = await fetchApi('/api/user/sessions', 'DELETE', {
          all: true,
        });

        if (!error) {
          showNotification({
            message: 'Logged out of all devices',
            color: 'blue',
            icon: <IconLogout size='1rem' />,
          });
        }
        mutate();
      },
      labels: {
        cancel: 'Cancel',
        confirm: 'Log out',
      },
    });
  };

  return (
    <Paper withBorder p='sm'>
      <Title order={2}>Sessions</Title>

      <Text c='dimmed' mt='sm'>
        You are currently logged into {isLoading ? '...' : (data?.other?.length ?? '...')} other devices
      </Text>

      <Button
        fullWidth
        color='red'
        mt='md'
        disabled={isLoading || !data?.other?.length}
        onClick={handleLogOutOfAllDevices}
        leftSection={<IconLogout size='1rem' />}
      >
        Log out everywhere
      </Button>
    </Paper>
  );
}
