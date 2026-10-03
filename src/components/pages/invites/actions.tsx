import { Response } from '@/lib/api/response';
import i18n from '@/lib/i18n';
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
    message: i18n.t('invites:delete.message', { code: invite.code }),
    onConfirm: () => handleDeleteInvite(invite),
    confirmLabel: i18n.t('invites:delete.confirm', { code: invite.code }),
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
      title: i18n.t('invites:notifications.deleteFailed.title'),
      message: error.error,
      color: 'red',
      icon: <IconTagOff size='1rem' />,
    });
  } else {
    notifications.show({
      title: i18n.t('invites:notifications.deleted.title'),
      message: i18n.t('invites:notifications.deleted.message', { code: data?.code }),
      color: 'green',
      icon: <IconCheck size='1rem' />,
    });
  }

  mutate('/api/auth/invites');
}
