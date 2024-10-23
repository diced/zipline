import { useConfig } from '@/components/ConfigProvider';
import RelativeDate from '@/components/RelativeDate';
import { Url } from '@/lib/db/models/url';
import { formatRootUrl } from '@/lib/url';
import { ActionIcon, Anchor, Card, Group, Menu, Stack, Text, Tooltip } from '@mantine/core';
import { useClipboard } from '@mantine/hooks';
import { IconCopy, IconDots, IconTrashFilled } from '@tabler/icons-react';
import { copyUrl, deleteUrl } from './actions';
import { useSettingsStore } from '@/lib/store/settings';

export default function UserCard({ url }: { url: Url }) {
  const config = useConfig();
  const clipboard = useClipboard();

  const warnDeletion = useSettingsStore((state) => state.settings.warnDeletion);

  return (
    <>
      <Card withBorder shadow='sm' radius='sm'>
        <Card.Section withBorder inheritPadding py='xs'>
          <Group justify='space-between'>
            <Text fw={400}>
              <Anchor
                href={formatRootUrl(config.urls.route, url.vanity ?? url.code)}
                target='_blank'
                rel='noopener noreferrer'
              >
                {url.vanity ?? url.code}
              </Anchor>
            </Text>

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
                  Copy short link
                </Menu.Item>
                <Menu.Item
                  leftSection={<IconCopy size='1rem' />}
                  onClick={() => clipboard.copy(url.destination.trim())}
                >
                  Copy destination
                </Menu.Item>
                <Menu.Item
                  leftSection={<IconTrashFilled size='1rem' />}
                  color='red'
                  onClick={() => deleteUrl(warnDeletion, url)}
                >
                  Delete
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
        </Card.Section>

        <Card.Section inheritPadding py='xs'>
          <Stack gap={1}>
            <Text size='xs' c='dimmed'>
              <b>Views:</b> {url.views.toLocaleString()}
            </Text>
            <Text size='xs' c='dimmed'>
              <b>Created:</b> <RelativeDate date={url.createdAt} />
            </Text>
            <Text size='xs' c='dimmed'>
              <b>Updated:</b> <RelativeDate date={url.updatedAt} />
            </Text>
            <Text size='xs' c='dimmed'>
              <b>Destination:</b>{' '}
              <Tooltip label={`Open "${url.destination.trim()}" in a new tab`}>
                <Anchor href={url.destination} target='_blank' rel='noopener noreferrer'>
                  {url.destination}
                </Anchor>
              </Tooltip>
            </Text>
            {url.vanity && (
              <Text size='xs' c='dimmed'>
                <b>Code:</b>{' '}
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
