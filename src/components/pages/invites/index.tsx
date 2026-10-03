import GridTableSwitcher from '@/components/GridTableSwitcher';
import { Response } from '@/lib/api/response';
import { Invite } from '@/lib/db/models/invite';
import { fetchApi } from '@/lib/fetchApi';
import { useViewStore } from '@/lib/client/store/view';
import { Button, Group, Modal, NumberInput, Select, Stack, Title } from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconPlus, IconTagOff } from '@tabler/icons-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { mutate } from 'swr';
import InviteGridView from './views/InviteGridView';
import InviteTableView from './views/InviteTableView';

export default function DashboardInvites() {
  const { t } = useTranslation(['invites', 'common']);
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
        message: error.error,
        color: 'red',
        icon: <IconTagOff size='1rem' />,
      });
    } else {
      notifications.show({
        title: t('notifications.created.title'),
        message: t('notifications.created.message', { code: data?.code }),
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
      <Modal centered opened={open} onClose={() => setOpen(false)} title={t('create.title')}>
        <form onSubmit={form.onSubmit(onSubmit)}>
          <Stack gap='sm'>
            <Select
              label={t('create.expiresAt.label')}
              description={t('create.expiresAt.description')}
              placeholder={t('create.expiresAt.placeholder')}
              data={[
                { value: 'never', label: t('expirations.never') },
                { value: '30min', label: t('expirations.minutes30') },
                { value: '1h', label: t('expirations.hour1') },
                { value: '6h', label: t('expirations.hours6') },
                { value: '12h', label: t('expirations.hours12') },
                { value: '1d', label: t('expirations.day1') },
                { value: '3d', label: t('expirations.days3') },
                { value: '5d', label: t('expirations.days5') },
                { value: '7d', label: t('expirations.days7') },
              ]}
              comboboxProps={{
                withinPortal: true,
                portalProps: {
                  style: {
                    zIndex: 100000000,
                  },
                },
              }}
              {...form.getInputProps('expiresAt')}
            />
            <NumberInput
              label={t('create.maxUses.label')}
              description={t('create.maxUses.description')}
              placeholder={t('create.maxUses.placeholder')}
              min={1}
              {...form.getInputProps('maxUses')}
            />

            <Button type='submit' variant='outline' fullWidth leftSection={<IconPlus size='1rem' />}>
              {t('common:actions.create')}
            </Button>
          </Stack>
        </form>
      </Modal>

      <Group>
        <Title>{t('title')}</Title>

        <Button
          variant='outline'
          size='compact-sm'
          leftSection={<IconPlus size='1rem' />}
          onClick={() => setOpen(true)}
        >
          {t('common:actions.create')}
        </Button>

        <GridTableSwitcher type='invites' />
      </Group>

      {view === 'grid' ? <InviteGridView /> : <InviteTableView />}
    </>
  );
}
