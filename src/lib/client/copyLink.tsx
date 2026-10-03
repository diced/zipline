import i18n from '@/lib/i18n';
import { Anchor } from '@mantine/core';
import type { useClipboard } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconCopy } from '@tabler/icons-react';
import { Link } from 'react-router-dom';

export function copyLink(url: string, clipboard: ReturnType<typeof useClipboard>, target: string = url) {
  clipboard.copy(url);

  notifications.show({
    title: i18n.t('layout:copyLink.title'),
    message: (
      <Anchor component={Link} to={target}>
        {url}
      </Anchor>
    ),
    color: 'green',
    icon: <IconCopy size='1rem' />,
  });
}
