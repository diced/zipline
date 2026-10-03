import { useConfig } from '@/components/ConfigProvider';
import RelativeDate from '@/components/RelativeDate';
import { Url } from '@/lib/db/models/url';
import { formatRootUrl, trimUrl } from '@/lib/url';
import { ActionIcon, Anchor, Card, Group, Menu, Stack, Text, Tooltip } from '@mantine/core';
import { useClipboard } from '@mantine/hooks';
import { IconCopy, IconDots, IconPencil, IconQrcode, IconTrashFilled } from '@tabler/icons-react';
import { copyUrl, deleteUrl } from './actions';
import { useSettingsStore } from '@/lib/client/store/settings';
import { useTranslation } from 'react-i18next';

export default function UrlCard({
  url,
  setSelectedUrl,
  setQrOpen,
}: {
  url: Url;
  setSelectedUrl: (url: Url) => void;
  setQrOpen: (url: Url) => void;
}) {
  const { t } = useTranslation(['urls', 'common']);
  const config = useConfig();
  const clipboard = useClipboard();

  const warnDeletion = useSettingsStore((state) => state.settings.warnDeletion);

  return (
    <>
      <Card withBorder shadow='sm'>
        <Card.Section withBorder inheritPadding py='xs'>
          <Group justify='space-between'>
            {url.enabled ? (
              <Anchor
                href={formatRootUrl(config.urls.route, url.vanity ?? url.code)}
                target='_blank'
                rel='noopener noreferrer'
                fw={400}
              >
                {url.vanity ?? url.code}
              </Anchor>
            ) : (
              <Text fw={400}>{url.vanity ?? url.code}</Text>
            )}

            <Menu withinPortal position='bottom-end' shadow='sm'>
              <Group gap={2}>
                <Menu.Target>
                  <ActionIcon variant='transparent'>
                    <IconDots size='1rem' />
                  </ActionIcon>
                </Menu.Target>
              </Group>

              <Menu.Dropdown>
                <Menu.Item
                  leftSection={<IconCopy size='1rem' />}
                  onClick={() => copyUrl(url, config, clipboard)}
                >
                  {t('card.copyShortLink')}
                </Menu.Item>
                <Menu.Item
                  leftSection={<IconCopy size='1rem' />}
                  onClick={() => clipboard.copy(url.destination.trim())}
                >
                  {t('card.copyDestination')}
                </Menu.Item>
                <Menu.Item leftSection={<IconQrcode size='1rem' />} onClick={() => setQrOpen(url)}>
                  {t('card.showQrCode')}
                </Menu.Item>
                <Menu.Item leftSection={<IconPencil size='1rem' />} onClick={() => setSelectedUrl(url)}>
                  {t('common:actions.edit')}
                </Menu.Item>
                <Menu.Item
                  leftSection={<IconTrashFilled size='1rem' />}
                  color='red'
                  onClick={() => deleteUrl(warnDeletion, url)}
                >
                  {t('common:actions.delete')}
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
        </Card.Section>

        <Card.Section inheritPadding py='xs'>
          <Stack gap={1}>
            <Text size='xs' c='dimmed'>
              <b>{t('card.views')}</b> {url.views.toLocaleString()}
            </Text>
            <Text size='xs' c='dimmed'>
              <b>{t('card.enabled')}</b> {url.enabled ? t('common:actions.yes') : t('common:actions.no')}
            </Text>
            <Text size='xs' c='dimmed'>
              <b>{t('card.created')}</b> <RelativeDate date={url.createdAt} />
            </Text>
            <Text size='xs' c='dimmed'>
              <b>{t('card.updated')}</b> <RelativeDate date={url.updatedAt} />
            </Text>
            <Text size='xs' c='dimmed'>
              <b>{t('card.destination')}</b>{' '}
              <Tooltip label={t('card.openDestination', { url: trimUrl(50, url.destination.trim()) })}>
                <Anchor href={url.destination} target='_blank' rel='noopener noreferrer'>
                  {trimUrl(30, url.destination.trim())}
                </Anchor>
              </Tooltip>
            </Text>
            {url.vanity && (
              <Text size='xs' c='dimmed'>
                <b>{t('card.code')}</b>{' '}
                <Anchor target='_blank' href={formatRootUrl(config.urls.route, url.code)}>
                  {url.code}
                </Anchor>
              </Text>
            )}
          </Stack>
        </Card.Section>
      </Card>
    </>
  );
}
