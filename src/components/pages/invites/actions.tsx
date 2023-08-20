import { Response } from '@/lib/api/response';
import { Invite } from '@/lib/db/models/invite';
import { fetchApi } from '@/lib/fetchApi';
import { conditionalWarning } from '@/lib/warningModal';
import { Anchor } from '@mantine/core';
import { useClipboard } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconCheck, IconCopy, IconTagOff } from '@tabler/icons-react';
import Link from 'next/link';
import { mutate } from 'swr';

export async function deleteInvite(warnDeletion: boolean, invite: Invite) {
  conditionalWarning(warnDeletion, {
    message: `Are you sure you want to delete invite ${invite.code}? This action cannot be undone.`,
    onConfirm: () => handleDeleteInvite(invite),
    confirmLabel: `Delete ${invite.code}`,
  });
}

export function copyInviteUrl(invite: Invite, clipboard: ReturnType<typeof useClipboard>) {
  clipboard.copy(`${window.location.protocol}//${window.location.host}/invite/${invite.code}`);

  notifications.show({
    title: 'Copied link',
    message: (
      <Anchor component={Link} href={`/invite/${invite.code}`}>
        {`${window.location.protocol}//${window.location.host}/invite/${invite.code}`}
      </Anchor>
    ),
    color: 'green',
    icon: <IconCopy size='1rem' />,
  });
}

async function handleDeleteInvite(invite: Invite) {
  const { data, error } = await fetchApi<Response['/api/auth/invites/[id]']>(
    `/api/auth/invites/${invite.id}`,
    'DELETE',
  );

  if (error) {
    notifications.show({
      title: 'Failed to delete invite',
      message: error.message,
      color: 'red',
      icon: <IconTagOff size='1rem' />,
    });
  } else {
    notifications.show({
      title: 'Invite deleted',
      message: `Invite ${data?.code} has been deleted.`,
      color: 'green',
      icon: <IconCheck size='1rem' />,
    });
  }

  mutate('/api/auth/invites');
}
