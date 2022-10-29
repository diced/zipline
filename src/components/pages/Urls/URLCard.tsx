import { ActionIcon, Card, Group, LoadingOverlay, Stack, Title, Tooltip } from '@mantine/core';
import { useClipboard } from '@mantine/hooks';
import { showNotification } from '@mantine/notifications';
import { CopyIcon, CrossIcon, DeleteIcon, ExternalLinkIcon } from 'components/icons';
import TrashIcon from 'components/icons/TrashIcon';
import Link from 'components/Link';
import MutedText from 'components/MutedText';
import { URLResponse, useURLDelete } from 'lib/queries/url';
import { relativeTime } from 'lib/utils/client';

export default function URLCard({ url }: { url: URLResponse }) {
  const clipboard = useClipboard();
  const urlDelete = useURLDelete();

  const copyURL = (u) => {
    clipboard.copy(`${window.location.protocol}//${window.location.host}${u.url}`);
    showNotification({
      title: 'Copied to clipboard',
      message: '',
      icon: <CopyIcon />,
    });
  };

  const deleteURL = async (u) => {
    urlDelete.mutate(u.id, {
      onSuccess: () => {
        showNotification({
          title: 'Deleted URL',
          message: '',
          icon: <CrossIcon />,
          color: 'green',
        });
      },

      onError: (url: any) => {
        showNotification({
          title: 'Failed to delete URL',
          message: url.error,
          icon: <DeleteIcon />,
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
            <Tooltip label={new Date(url.created_at).toLocaleString()}>
              <div>
                <MutedText size='sm'>Created: {relativeTime(new Date(url.created_at))}</MutedText>
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
        <Group position='right'>
          <ActionIcon href={url.url} component='a' target='_blank'>
            <ExternalLinkIcon />
          </ActionIcon>
          <ActionIcon aria-label='copy' onClick={() => copyURL(url)}>
            <CopyIcon />
          </ActionIcon>
          <ActionIcon aria-label='delete' onClick={() => deleteURL(url)}>
            <TrashIcon />
          </ActionIcon>
        </Group>
      </Group>
    </Card>
  );
}
