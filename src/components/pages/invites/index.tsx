import GridTableSwitcher from '@/components/GridTableSwitcher';
import { useViewStore } from '@/lib/store/view';
import { ActionIcon, Button, Group, Modal, NumberInput, Select, Stack, Title, Tooltip } from '@mantine/core';
import { IconPlus, IconTagOff } from '@tabler/icons-react';
import { useState } from 'react';
import InviteGridView from './views/InviteGridView';
import InviteTableView from './views/InviteTableView';
import { useForm } from '@mantine/form';
import { fetchApi } from '@/lib/fetchApi';
import { Response } from '@/lib/api/response';
import { notifications } from '@mantine/notifications';
import { Invite } from '@/lib/db/models/invite';
import { mutate } from 'swr';

export default function DashboardInvites() {
  const view = useViewStore((state) => state.invites);
  const [open, setOpen] = useState(false);

  const form = useForm<{
    maxUses: number | '';
    expiresAt: string;
  }>({
    initialValues: {
      maxUses: '',
      expiresAt: 'never',
    },
  });

  const onSubmit = async (values: typeof form.values) => {
    const send = {
      expiresAt: values.expiresAt,
      ...(values.maxUses && { maxUses: values.maxUses === 0 ? null : values.maxUses }),
    };

    const { data, error } = await fetchApi<Extract<Response['/api/auth/invites'], Invite>>(
      '/api/auth/invites',
      'POST',
      send,
    );

    if (error) {
      notifications.show({
        message: error.message,
        color: 'red',
        icon: <IconTagOff size='1rem' />,
      });
    } else {
      notifications.show({
        title: 'Invite created',
        message: `Invite ${data?.code} has been created.`,
        color: 'green',
        icon: <IconPlus size='1rem' />,
      });

      mutate('/api/auth/invites');
      setOpen(false);
      form.reset();
    }
  };

  return (
    <>
      <Modal centered opened={open} onClose={() => setOpen(false)} title={<Title>Create an invite</Title>}>
        <form onSubmit={form.onSubmit(onSubmit)}>
          <Stack spacing='sm'>
            <Select
              label='Expires at'
              description='Select an expiration for this invite, or choose "never" if you want the invite to never expire.'
              placeholder='Select an expiration...'
              data={[
                { value: 'never', label: 'Never' },
                { value: '30min', label: '30 minutes' },
                { value: '1h', label: '1 hour' },
                { value: '6h', label: '6 hours' },
                { value: '12h', label: '12 hours' },
                { value: '1d', label: '1 day' },
                { value: '3d', label: '3 days' },
                { value: '5d', label: '5 days' },
                { value: '7d', label: '7 days' },
              ]}
              withinPortal
              portalProps={{
                style: {
                  zIndex: 100000000,
                },
              }}
              dropdownPosition='bottom'
              {...form.getInputProps('expiresAt')}
            />
            <NumberInput
              label='Max uses'
              description='Set a maximum number of uses for this invite, or leave blank for unlimited uses.'
              placeholder='Enter a number...'
              min={1}
              {...form.getInputProps('maxUses')}
            />

            <Button type='submit' variant='outline' fullWidth radius='sm' leftIcon={<IconPlus size='1rem' />}>
              Create
            </Button>
          </Stack>
        </form>
      </Modal>

      <Group>
        <Title>Invites</Title>

        <Tooltip label='Create a new invite'>
          <ActionIcon variant='outline' onClick={() => setOpen(true)}>
            <IconPlus size='1rem' />
          </ActionIcon>
        </Tooltip>

        <GridTableSwitcher type='invites' />
      </Group>

      {view === 'grid' ? <InviteGridView /> : <InviteTableView />}
    </>
  );
}
