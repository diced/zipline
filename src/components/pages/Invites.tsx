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
  Tooltip,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useClipboard } from '@mantine/hooks';
import { useModals } from '@mantine/modals';
import { showNotification } from '@mantine/notifications';
import type { Invite } from '@prisma/client';
import {
  IconClipboardCopy,
  IconGridDots,
  IconList,
  IconPlus,
  IconTag,
  IconTagOff,
  IconTrash,
} from '@tabler/icons-react';
import MutedText from 'components/MutedText';
import useFetch from 'hooks/useFetch';
import { listViewInvitesSelector } from 'lib/recoil/settings';
import { expireReadToDate, expireText, relativeTime } from 'lib/utils/client';
import { DataTable, DataTableSortStatus } from 'mantine-datatable';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { useRecoilState } from 'recoil';

const expires = ['30min', '1h', '6h', '12h', '1d', '3d', '5d', '7d', 'never'];

function CreateInviteModal({ open, setOpen, updateInvites }) {
  const form = useForm({
    initialValues: {
      expires: '30min',
      count: 1,
    },
  });

  const onSubmit = async (values) => {
    if (!expires.includes(values.expires)) return form.setFieldError('expires', 'Invalid expiration');
    if (values.count < 1 || values.count > 100)
      return form.setFieldError('count', 'Must be between 1 and 100');
    const expiresAt = values.expires === 'never' ? null : expireReadToDate(values.expires);

    setOpen(false);

    const res = await useFetch('/api/auth/invite', 'POST', {
      expiresAt: expiresAt === null ? null : `date=${expiresAt.toISOString()}`,
      count: values.count,
    });

    if (res.error) {
      showNotification({
        title: 'Failed to create invite',
        message: res.error,
        icon: <IconTagOff size='1rem' />,
        color: 'red',
      });
    } else {
      showNotification({
        title: 'Created invite',
        message: '',
        icon: <IconTag size='1rem' />,
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
          maxDropdownHeight={100}
          data={[
            { value: '30min', label: '30 minutes' },
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
          parser={(v: string) => v.replace(/[^\d]/g, '')}
        />

        <Group position='right' mt='md'>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button type='submit'>Create</Button>
        </Group>
      </form>
    </Modal>
  );
}

export default function Invites() {
  const router = useRouter();
  const modals = useModals();
  const clipboard = useClipboard();

  const [invites, setInvites] = useState<Invite[]>([]);
  const [open, setOpen] = useState(false);
  const [ok, setOk] = useState(false);

  const [listView, setListView] = useRecoilState(listViewInvitesSelector);

  const [sortStatus, setSortStatus] = useState<DataTableSortStatus>({
    columnAccessor: 'createdAt',
    direction: 'asc',
  });
  const [records, setRecords] = useState(invites);

  useEffect(() => {
    setRecords(invites);
  }, [invites]);

  useEffect(() => {
    if (!records || records.length === 0) return;

    const sortedRecords = [...records].sort((a, b) => {
      if (sortStatus.direction === 'asc') {
        return a[sortStatus.columnAccessor] > b[sortStatus.columnAccessor] ? 1 : -1;
      }

      return a[sortStatus.columnAccessor] < b[sortStatus.columnAccessor] ? 1 : -1;
    });

    setRecords(sortedRecords);
  }, [sortStatus]);

  const openDeleteModal = (invite) =>
    modals.openConfirmModal({
      title: `Delete ${invite.code}?`,
      centered: true,
      overlayProps: { blur: 3 },
      labels: { confirm: 'Yes', cancel: 'No' },
      onConfirm: async () => {
        const res = await useFetch(`/api/auth/invite?code=${invite.code}`, 'DELETE');
        if (res.error) {
          showNotification({
            title: `Failed to delete invite ${invite.code}`,
            message: res.error,
            icon: <IconTagOff size='1rem' />,
            color: 'red',
          });
        } else {
          showNotification({
            title: `Deleted invite ${invite.code}`,
            message: '',
            icon: <IconTag size='1rem' />,
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
      icon: <IconClipboardCopy size='1rem' />,
    });
  };

  const updateInvites = async () => {
    const us = await useFetch('/api/auth/invite');
    if (!us.error) {
      setInvites(us);
      setOk(true);
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
          <IconPlus size='1rem' />
        </ActionIcon>
        <Tooltip label={listView ? 'Switch to grid view' : 'Switch to list view'}>
          <ActionIcon variant='filled' color='primary' onClick={() => setListView(!listView)}>
            {listView ? <IconList size='1rem' /> : <IconGridDots size='1rem' />}
          </ActionIcon>
        </Tooltip>
      </Group>
      {listView ? (
        <DataTable
          withBorder
          borderRadius='md'
          highlightOnHover
          verticalSpacing='sm'
          columns={[
            { accessor: 'id', sortable: true },
            { accessor: 'code', sortable: true },
            {
              accessor: 'createdAt',
              title: 'Created At',
              sortable: true,
              render: (invite) => new Date(invite.createdAt).toLocaleString(),
            },
            {
              accessor: 'expiresAt',
              title: 'Expires At',
              sortable: true,
              render: (invite) => new Date(invite.expiresAt).toLocaleString(),
            },
            {
              accessor: 'used',
              sortable: true,
              render: (invite) => (invite.used ? 'Yes' : 'No'),
            },
            {
              accessor: 'actions',
              textAlignment: 'right',
              render: (invite) => (
                <Group spacing={4} position='right' noWrap>
                  <Tooltip label='Copy invite link'>
                    <ActionIcon variant='subtle' color='primary' onClick={() => handleCopy(invite)}>
                      <IconClipboardCopy size='1rem' />
                    </ActionIcon>
                  </Tooltip>
                  <Tooltip label='Delete invite'>
                    <ActionIcon variant='subtle' color='red' onClick={() => openDeleteModal(invite)}>
                      <IconTrash size='1rem' />
                    </ActionIcon>
                  </Tooltip>
                </Group>
              ),
            },
          ]}
          sortStatus={sortStatus}
          onSortStatusChange={setSortStatus}
          records={records ?? []}
          fetching={!ok}
          minHeight='calc(100vh - 200px)'
          loaderBackgroundBlur={5}
          loaderVariant='dots'
          rowContextMenu={{
            shadow: 'xl',
            borderRadius: 'md',
            items: (invite) => [
              {
                key: 'copy',
                icon: <IconClipboardCopy size='1rem' />,
                title: `Copy invite code: "${invite.code}"`,
                onClick: () => clipboard.copy(invite.code),
              },
              {
                key: 'copyLink',
                icon: <IconClipboardCopy size='1rem' />,
                title: 'Copy invite link',
                onClick: () => handleCopy(invite),
              },
              {
                key: 'delete',
                icon: <IconTrash size='1rem' />,
                title: `Delete invite ${invite.code}`,
                onClick: () => openDeleteModal(invite),
              },
            ],
          }}
        />
      ) : (
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
                        <Tooltip label={new Date(invite.createdAt).toLocaleString()}>
                          <div>
                            <MutedText size='sm'>
                              Created {relativeTime(new Date(invite.createdAt))}
                            </MutedText>
                          </div>
                        </Tooltip>
                        <Tooltip label={new Date(invite.expiresAt).toLocaleString()}>
                          <div>
                            <MutedText size='sm'>{expireText(invite.expiresAt.toString())}</MutedText>
                          </div>
                        </Tooltip>
                      </Stack>
                    </Group>
                    <Stack>
                      <ActionIcon aria-label='copy' onClick={() => handleCopy(invite)}>
                        <IconClipboardCopy size='1rem' />
                      </ActionIcon>
                      <ActionIcon aria-label='delete' onClick={() => openDeleteModal(invite)}>
                        <IconTrash size='1rem' />
                      </ActionIcon>
                    </Stack>
                  </Group>
                </Card>
              ))
            : [1, 2, 3].map((x) => <Skeleton key={x} width='100%' height={100} radius='sm' />)}
        </SimpleGrid>
      )}
    </>
  );
}
