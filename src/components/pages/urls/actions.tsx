import { Response } from '@/lib/api/response';
import i18n from '@/lib/i18n';
import { copyLink } from '@/lib/client/copyLink';
import type { SafeConfig } from '@/lib/config/safe';
import { Url } from '@/lib/db/models/url';
import { fetchApi } from '@/lib/fetchApi';
import { formatRootUrl } from '@/lib/url';
import { conditionalWarning } from '@/lib/client/warningModal';
import { getDomain } from '@/lib/client/webDomain';
import { useClipboard } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconCheck, IconLinkOff } from '@tabler/icons-react';
import { mutate } from 'swr';

export async function deleteUrl(warnDeletion: boolean, url: Url) {
  conditionalWarning(warnDeletion, {
    message: i18n.t('urls:delete.message', { code: url.code ?? url.vanity }),
    onConfirm: () => handleDeleteUrl(url),
    confirmLabel: i18n.t('urls:delete.confirm', { code: url.code ?? url.vanity }),
  });
}

export function copyUrl(url: Url, config: SafeConfig, clipboard: ReturnType<typeof useClipboard>) {
  const urlFormatted = getDomain(formatRootUrl(config.urls.route, url.vanity ?? url.code));

  copyLink(urlFormatted, clipboard);
}

async function handleDeleteUrl(url: Url) {
  const { data, error } = await fetchApi<Response['/api/user/urls/[id]']>(
    `/api/user/urls/${url.id}`,
    'DELETE',
  );

  if (error) {
    notifications.show({
      title: i18n.t('urls:notifications.deleteFailed.title'),
      message: error.error,
      color: 'red',
      icon: <IconLinkOff size='1rem' />,
    });
  } else {
    notifications.show({
      title: i18n.t('urls:notifications.deleted.title'),
      message: i18n.t('urls:notifications.deleted.message', { code: data?.code ?? data?.vanity }),
      color: 'green',
      icon: <IconCheck size='1rem' />,
    });
  }

  mutateUrls();
}

function mutateUrls() {
  mutate('/api/user/urls');
  mutate((key) => (key as Record<any, any>)?.key === '/api/user/urls');
}
