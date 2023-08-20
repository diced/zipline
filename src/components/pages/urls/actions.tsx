import { Response } from '@/lib/api/response';
import type { SafeConfig } from '@/lib/config/safe';
import { Url } from '@/lib/db/models/url';
import { fetchApi } from '@/lib/fetchApi';
import { formatRootUrl } from '@/lib/url';
import { conditionalWarning } from '@/lib/warningModal';
import { Anchor } from '@mantine/core';
import { useClipboard } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconCheck, IconCopy, IconLinkOff } from '@tabler/icons-react';
import Link from 'next/link';
import { mutate } from 'swr';

export async function deleteUrl(warnDeletion: boolean, url: Url) {
  conditionalWarning(warnDeletion, {
    message: `Are you sure you want to delete ${url.code ?? url.vanity}? This action cannot be undone.`,
    onConfirm: () => handleDeleteUrl(url),
    confirmLabel: `Delete '${url.code ?? url.vanity}'`,
  });
}

export function copyUrl(url: Url, config: SafeConfig, clipboard: ReturnType<typeof useClipboard>) {
  const domain = `${window.location.protocol}//${window.location.host}`;

  clipboard.copy(`${domain}${formatRootUrl(config.urls.route, url.vanity ?? url.code)}`);

  notifications.show({
    title: 'Copied link',
    message: (
      <Anchor component={Link} href={formatRootUrl(config.urls.route, url.vanity ?? url.code)}>
        {`${domain}${formatRootUrl(config.urls.route, url.vanity ?? url.code)}`}
      </Anchor>
    ),
    color: 'green',
    icon: <IconCopy size='1rem' />,
  });
}

async function handleDeleteUrl(url: Url) {
  const { data, error } = await fetchApi<Response['/api/user/urls/[id]']>(
    `/api/user/urls/${url.id}`,
    'DELETE',
  );

  if (error) {
    notifications.show({
      title: 'Failed to delete url',
      message: error.message,
      color: 'red',
      icon: <IconLinkOff size='1rem' />,
    });
  } else {
    notifications.show({
      title: 'Url deleted',
      message: `Url ${data?.code ?? data?.vanity} has been deleted`,
      color: 'green',
      icon: <IconCheck size='1rem' />,
    });
  }

  mutateURls();
}

function mutateURls() {
  mutate('/api/user/urls');
  mutate((key) => (key as Record<any, any>)?.key === '/api/user/urls');
}
