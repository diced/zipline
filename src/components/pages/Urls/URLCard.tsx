import { ActionIcon, Card, Group, LoadingOverlay, Stack, Title, Tooltip } from '@mantine/core';
import { useClipboard } from '@mantine/hooks';
import { showNotification } from '@mantine/notifications';
import { IconClipboardCopy, IconExternalLink, IconLink, IconLinkOff, IconTrash } from '@tabler/icons-react';
import Link from 'components/Link';
import MutedText from 'components/MutedText';
import { URLResponse, useURLDelete } from 'lib/queries/url';
import { relativeTime } from 'lib/utils/client';

export default function URLCard({ url }: { url: URLResponse }) {
  const clipboard = useClipboard();
  const urlDelete = useURLDelete();

  const copyURL = (u) => {
    clipboard.copy(`${window.location.protocol}//${window.location.host}${u.url}`);
    if (!navigator.clipboard)
      showNotification({
        title: 'Unable to copy to clipboard',
        message: 'Zipline is unable to copy to clipboard due to security reasons.',
        color: 'red',
      });
    else
      showNotification({
        title: 'Copied to clipboard',
        message: '',
        icon: <IconClipboardCopy size='1rem' />,
      });
  };

  const deleteURL = async (u) => {
    urlDelete.mutate(u.id, {
      onSuccess: () => {
        showNotification({
          title: 'Deleted URL',
          message: '',
          icon: <IconLink size='1rem' />,
          color: 'green',
        });
      },

      onError: (url: any) => {
        showNotification({
          title: 'Failed to delete URL',
          message: url.error,
          icon: <IconLinkOff size='1rem' />,
          color: 'red',
        });
      },
    });
  };

  return (
    <Card key={url.id} sx={{ maxWidth: '100%' }} shadow='sm'>
      <LoadingOverlay visible={urlDelete.isLoading} />

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
              URL: <Link href={url.destination}>{url.destination}</Link>
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
