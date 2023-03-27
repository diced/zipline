import { ActionIcon, Card, Group, Stack, Title, Tooltip } from '@mantine/core';
import { IconClipboardCopy, IconExternalLink, IconTrash } from '@tabler/icons-react';
import AnchorNext from 'components/AnchorNext';
import MutedText from 'components/MutedText';
import { URLResponse } from 'lib/queries/url';
import { relativeTime } from 'lib/utils/client';

export default function URLCard({
  url,
  copyURL,
  deleteURL,
}: {
  url: URLResponse;
  copyURL: (u: URLResponse) => void;
  deleteURL: (u: URLResponse) => void;
}) {
  return (
    <Card key={url.id} sx={{ maxWidth: '100%' }} shadow='sm'>
      <Group position='apart'>
        <Group position='left'>
          <Stack spacing={0}>
            <Title>{url.vanity ?? url.id}</Title>
            <Tooltip label={new Date(url.createdAt).toLocaleString()}>
              <div>
                <MutedText size='sm'>Created: {relativeTime(new Date(url.createdAt))}</MutedText>
              </div>
            </Tooltip>
            {url.vanity && <MutedText size='sm'>ID: {url.id}</MutedText>}
            {url.maxViews && (
              <Tooltip label='This URL will delete itself after reaching this treshold.'>
                <div>
                  <MutedText size='sm'>Max Views: {url.maxViews}</MutedText>
                </div>
              </Tooltip>
            )}
            <MutedText size='sm'>Views: {url.views}</MutedText>
            <MutedText size='sm'>
              URL: <AnchorNext href={url.destination}>{url.destination}</AnchorNext>
            </MutedText>
          </Stack>
        </Group>
        <Stack>
          <ActionIcon href={url.url} component='a' target='_blank'>
            <IconExternalLink size='1rem' />
          </ActionIcon>
          <ActionIcon aria-label='copy' onClick={() => copyURL(url)}>
            <IconClipboardCopy size='1rem' />
          </ActionIcon>
          <ActionIcon aria-label='delete' onClick={() => deleteURL(url)}>
            <IconTrash size='1rem' />
          </ActionIcon>
        </Stack>
      </Group>
    </Card>
  );
}
