import { useConfig } from '@/components/ConfigProvider';
import RelativeDate from '@/components/RelativeDate';
import { Url } from '@/lib/db/models/url';
import { formatRootUrl } from '@/lib/url';
import { ActionIcon, Anchor, Card, Group, Menu, Stack, Text } from '@mantine/core';
import { IconCopy, IconDots, IconTrashFilled } from '@tabler/icons-react';
import { useState } from 'react';
import { copyUrl, deleteUrl } from './actions';
import { useClipboard } from '@mantine/hooks';

export default function UserCard({ url }: { url: Url }) {
  const config = useConfig();
  const clipboard = useClipboard();

  return (
    <>
      <Card withBorder shadow='sm' radius='sm'>
        <Card.Section withBorder inheritPadding py='xs'>
          <Group position='apart'>
            <Text weight={400}>
              <Anchor
                href={formatRootUrl(config.urls.route, url.vanity ?? url.code)}
                target='_blank'
                rel='noopener noreferrer'
              >
                {url.vanity ?? url.code}
              </Anchor>
            </Text>

            <Menu withinPortal position='bottom-end' shadow='sm'>
              <Group spacing={2}>
                <Menu.Target>
                  <ActionIcon>
                    <IconDots size='1rem' />
                  </ActionIcon>
                </Menu.Target>
              </Group>

              <Menu.Dropdown>
                <Menu.Item icon={<IconCopy size='1rem' />} onClick={() => copyUrl(url, config, clipboard)}>
                  Copy
                </Menu.Item>
                <Menu.Item icon={<IconTrashFilled size='1rem' />} color='red' onClick={() => deleteUrl(url)}>
                  Delete
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
        </Card.Section>

        <Card.Section inheritPadding py='xs'>
          <Stack spacing={1}>
            <Text size='xs' color='dimmed'>
              <b>Created:</b> <RelativeDate date={url.createdAt} />
            </Text>
            <Text size='xs' color='dimmed'>
              <b>Updated:</b> <RelativeDate date={url.updatedAt} />
            </Text>
            <Text size='xs' color='dimmed'>
              <b>Destination:</b>{' '}
              <Anchor href={url.destination} target='_blank' rel='noopener noreferrer'>
                {url.destination}
              </Anchor>
            </Text>
            {url.vanity && (
              <Text size='xs' color='dimmed'>
                <b>Code:</b> {url.code}
              </Text>
            )}
          </Stack>
        </Card.Section>
      </Card>
    </>
  );
}
