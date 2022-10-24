import {
  ActionIcon,
  Avatar,
  Button,
  Card,
  Group,
  Modal,
  NumberInput,
  Select,
  SimpleGrid,
  Skeleton,
  Stack,
  Title,
} from '@mantine/core';
import { useClipboard } from '@mantine/hooks';
import { useForm } from '@mantine/form';
import { useModals } from '@mantine/modals';
import { showNotification } from '@mantine/notifications';
import { CopyIcon, CrossIcon, DeleteIcon, PlusIcon, TagIcon } from 'components/icons';
import MutedText from 'components/MutedText';
import useFetch from 'hooks/useFetch';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

const expires = ['30m', '1h', '6h', '12h', '1d', '3d', '5d', '7d', 'never'];

function CreateInviteModal({ open, setOpen, updateInvites }) {
  const form = useForm({
    initialValues: {
      expires: '30m',
      count: 1,
    },
  });

  const onSubmit = async (values) => {
    if (!expires.includes(values.expires)) return form.setFieldError('expires', 'Invalid expiration');
    if (values.count < 1 || values.count > 100)
      return form.setFieldError('count', 'Must be between 1 and 100');
    const expires_at =
      values.expires === 'never'
        ? null
        : new Date(
            {
              '30m': Date.now() + 30 * 60 * 1000,
              '1h': Date.now() + 60 * 60 * 1000,
              '6h': Date.now() + 6 * 60 * 60 * 1000,
              '12h': Date.now() + 12 * 60 * 60 * 1000,
              '1d': Date.now() + 24 * 60 * 60 * 1000,
              '5d': Date.now() + 5 * 24 * 60 * 60 * 1000,
              '7d': Date.now() + 7 * 24 * 60 * 60 * 1000,
            }[values.expires]
          );

    setOpen(false);

    const res = await useFetch('/api/auth/invite', 'POST', {
      expires_at,
      count: values.count,
    });

    if (res.error) {
      showNotification({
        title: 'Failed to create invite',
        message: res.error,
        icon: <CrossIcon />,
        color: 'red',
      });
    } else {
      showNotification({
        title: 'Created invite',
        message: '',
        icon: <TagIcon />,
        color: 'green',
      });
    }

    updateInvites();
  };

  return (
    <Modal opened={open} onClose={() => setOpen(false)} title={<Title>Create Invite</Title>}>
      <form onSubmit={form.onSubmit((v) => onSubmit(v))}>
        <Select
          label='Expires'
          id='expires'
          {...form.getInputProps('expires')}
          data={[
            { value: '30m', label: '30 minutes' },
            { value: '1h', label: '1 hour' },
            { value: '6h', label: '6 hours' },
            { value: '12h', label: '12 hours' },
            { value: '1d', label: '1 day' },
            { value: '3d', label: '3 days' },
            { value: '5d', label: '5 days' },
            { value: '7d', label: '7 days' },
            { value: 'never', label: 'Never' },
          ]}
        />

        <NumberInput
          label='Count'
          id='count'
          {...form.getInputProps('count')}
          precision={0}
          min={1}
          stepHoldDelay={200}
          stepHoldInterval={100}
          parser={(v: string) => Number(v.replace(/[^\d]/g, ''))}
        />

        <Group position='right' mt='md'>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button type='submit'>Create</Button>
        </Group>
      </form>
    </Modal>
  );
}

export default function Users() {
  const router = useRouter();
  const modals = useModals();
  const clipboard = useClipboard();

  const [invites, setInvites] = useState([]);
  const [open, setOpen] = useState(false);

  const openDeleteModal = (invite) =>
    modals.openConfirmModal({
      title: `Delete ${invite.code}?`,
      centered: true,
      overlayBlur: 3,
      labels: { confirm: 'Yes', cancel: 'No' },
      onConfirm: async () => {
        const res = await useFetch(`/api/auth/invite?code=${invite.code}`, 'DELETE');
        if (res.error) {
          showNotification({
            title: 'Failed to delete invite ${invite.code}',
            message: res.error,
            icon: <CrossIcon />,
            color: 'red',
          });
        } else {
          showNotification({
            title: `Deleted invite ${invite.code}`,
            message: '',
            icon: <DeleteIcon />,
            color: 'green',
          });
        }

        updateInvites();
      },
    });

  const handleCopy = async (invite) => {
    clipboard.copy(`${window.location.protocol}//${window.location.host}/auth/register?code=${invite.code}`);
    showNotification({
      title: 'Copied to clipboard',
      message: '',
      icon: <CopyIcon />,
    });
  };

  const updateInvites = async () => {
    const us = await useFetch('/api/auth/invite');
    if (!us.error) {
      setInvites(us);
    } else {
      router.push('/dashboard');
    }
  };

  useEffect(() => {
    updateInvites();
  }, []);

  return (
    <>
      <CreateInviteModal open={open} setOpen={setOpen} updateInvites={updateInvites} />
      <Group mb='md'>
        <Title>Invites</Title>
        <ActionIcon variant='filled' color='primary' onClick={() => setOpen(true)}>
          <PlusIcon />
        </ActionIcon>
      </Group>
      <SimpleGrid cols={3} spacing='lg' breakpoints={[{ maxWidth: 'sm', cols: 1, spacing: 'sm' }]}>
        {invites.length
          ? invites.map((invite) => (
              <Card key={invite.id} sx={{ maxWidth: '100%' }}>
                <Group position='apart'>
                  <Group position='left'>
                    <Avatar size='lg' color={invite.used ? 'dark' : 'primary'}>
                      {invite.id}
                    </Avatar>
                    <Stack spacing={0}>
                      <Title>
                        {invite.code}
                        {invite.used && <> (Used)</>}
                      </Title>
                      <MutedText size='sm'>Created: {new Date(invite.created_at).toLocaleString()}</MutedText>
                      <MutedText size='sm'>
                        Expires: {invite.expires_at ? new Date(invite.expires_at).toLocaleString() : 'Never'}
                      </MutedText>
                    </Stack>
                  </Group>
                  <Group position='right'>
                    <ActionIcon aria-label='copy' onClick={() => handleCopy(invite)}>
                      <CopyIcon />
                    </ActionIcon>
                    <ActionIcon aria-label='delete' onClick={() => openDeleteModal(invite)}>
                      <DeleteIcon />
                    </ActionIcon>
                  </Group>
                </Group>
              </Card>
            ))
          : [1, 2, 3].map((x) => <Skeleton key={x} width='100%' height={100} radius='sm' />)}
      </SimpleGrid>
    </>
  );
}
