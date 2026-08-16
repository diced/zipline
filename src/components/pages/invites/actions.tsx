import { Response } from '@/lib/api/response';
import { copyLink } from '@/lib/client/copyLink';
import { Invite } from '@/lib/db/models/invite';
import { fetchApi } from '@/lib/fetchApi';
import { conditionalWarning } from '@/lib/client/warningModal';
import { getDomain } from '@/lib/client/webDomain';
import { useClipboard } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconCheck, IconTagOff } from '@tabler/icons-react';
import { mutate } from 'swr';

export async function deleteInvite(warnDeletion: boolean, invite: Invite) {
  conditionalWarning(warnDeletion, {
    message: `Are you sure you want to delete invite ${invite.code}? This action cannot be undone.`,
    onConfirm: () => handleDeleteInvite(invite),
    confirmLabel: `Delete ${invite.code}`,
  });
}

export function copyInviteUrl(invite: Invite, clipboard: ReturnType<typeof useClipboard>) {
  const url = getDomain(`/invite/${invite.code}`);
  copyLink(url, clipboard, `/invite/${invite.code}`);
}

async function handleDeleteInvite(invite: Invite) {
  const { data, error } = await fetchApi<Response['/api/auth/invites/[id]']>(
    `/api/auth/invites/${invite.id}`,
    'DELETE',
  );

  if (error) {
    notifications.show({
      title: 'Failed to delete invite',
      message: error.error,
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
