import {
  ActionIcon,
  Anchor,
  Button,
  Card,
  Center,
  Group,
  Modal,
  NumberInput,
  SimpleGrid,
  Skeleton,
  Text,
  TextInput,
  Title,
  Tooltip,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useClipboard } from '@mantine/hooks';
import { useModals } from '@mantine/modals';
import { showNotification } from '@mantine/notifications';
import {
  IconClipboardCopy,
  IconExternalLink,
  IconGridDots,
  IconLink,
  IconLinkOff,
  IconList,
} from '@tabler/icons-react';
import AnchorNext from 'components/AnchorNext';
import MutedText from 'components/MutedText';
import { useURLDelete, useURLs } from 'lib/queries/url';
import { listViewUrlsSelector } from 'lib/recoil/settings';
import { userSelector } from 'lib/recoil/user';
import { DataTable, DataTableSortStatus } from 'mantine-datatable';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRecoilState, useRecoilValue } from 'recoil';
import URLCard from './URLCard';

export default function Urls() {
  const user = useRecoilValue(userSelector);

  const modals = useModals();
  const clipboard = useClipboard();

  const urls = useURLs();
  const [createOpen, setCreateOpen] = useState(false);

  const updateURLs = async () => urls.refetch();

  const [listView, setListView] = useRecoilState(listViewUrlsSelector);

  const [sortStatus, setSortStatus] = useState<DataTableSortStatus>({
    columnAccessor: 'id',
    direction: 'asc',
  });
  const [records, setRecords] = useState(urls.data);

  useEffect(() => {
    setRecords(urls.data);
  }, [urls.data]);

  useEffect(() => {
    if (!records || records.length === 0) return;

    const sortedRecords = [...records].sort((a, b) => {
      if (sortStatus.direction === 'asc') {
        return a[sortStatus.columnAccessor] > b[sortStatus.columnAccessor] ? 1 : -1;
      }

      return a[sortStatus.columnAccessor] < b[sortStatus.columnAccessor] ? 1 : -1;
    });

    setRecords(sortedRecords);
  }, [sortStatus]);

  const form = useForm({
    initialValues: {
      url: '',
      vanity: '',
      maxViews: undefined,
    },
  });

  const copy = (url) => {
    clipboard.copy(url);
    showNotification({
      title: 'Copied to clipboard',
      message: <AnchorNext href={url}>{url}</AnchorNext>,
      color: 'green',
      icon: <IconClipboardCopy size='1rem' />,
    });
  };

  const onSubmit = async (values) => {
    const cleanURL = values.url.trim();
    const cleanVanity = values.vanity.trim();

    if (cleanURL === '') return form.setFieldError('url', "URL can't be nothing");

    try {
      new URL(cleanURL);
    } catch (e) {
      return form.setFieldError('url', 'Invalid URL');
    }

    const data: {
      url: string;
      vanity?: string;
    } = {
      url: cleanURL,
      vanity: cleanVanity === '' ? null : cleanVanity,
    };

    const headers = {};

    if (values.maxViews && values.maxViews !== 0) headers['Max-Views'] = values.maxViews;

    setCreateOpen(false);
    const res = await fetch('/api/shorten', {
      method: 'POST',
      headers: {
        Authorization: user.token,
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(data),
    });
    const json = await res.json();

    if (json.error) {
      showNotification({
        title: 'Failed to create URL',
        message: json.error,
        color: 'red',
        icon: <IconLinkOff size='1rem' />,
      });
    } else {
      modals.openModal({
        title: <Title>Shortened URL!</Title>,
        size: 'auto',
        children: (
          <Group position='apart'>
            <Group position='left'>
              <AnchorNext href={json.url}>{data.vanity ?? json.url}</AnchorNext>
            </Group>
            <Group position='right'>
              <Tooltip label='Open link in a new tab'>
                <ActionIcon onClick={() => window.open(json.url, '_blank')} variant='filled' color='primary'>
                  <IconExternalLink size='1rem' />
                </ActionIcon>
              </Tooltip>
              <Tooltip label='Copy link to clipboard'>
                <ActionIcon onClick={() => copy(json.url)} variant='filled' color='primary'>
                  <IconClipboardCopy size='1rem' />
                </ActionIcon>
              </Tooltip>
            </Group>
          </Group>
        ),
      });
    }

    updateURLs();
  };

  useEffect(() => {
    updateURLs();
  }, []);

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

  const urlDelete = useURLDelete();
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
    <>
      <Modal opened={createOpen} onClose={() => setCreateOpen(false)} title={<Title>Shorten URL</Title>}>
        <form onSubmit={form.onSubmit((v) => onSubmit(v))}>
          <TextInput id='url' label='URL' {...form.getInputProps('url')} />
          <TextInput id='vanity' label='Vanity' {...form.getInputProps('vanity')} />
          <NumberInput id='maxViews' label='Max Views' {...form.getInputProps('maxViews')} min={0} />

          <Group position='right' mt='md'>
            <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button type='submit'>Submit</Button>
          </Group>
        </form>
      </Modal>

      <Group mb='md'>
        <Title>URLs</Title>
        <ActionIcon variant='filled' color='primary' onClick={() => setCreateOpen(true)}>
          <IconLink size='1rem' />
        </ActionIcon>
        <Tooltip label={listView ? 'Switch to grid view' : 'Switch to list view'}>
          <ActionIcon variant='filled' color='primary' onClick={() => setListView(!listView)}>
            {listView ? <IconList size='1rem' /> : <IconGridDots size='1rem' />}
          </ActionIcon>
        </Tooltip>
      </Group>

      {!listView && urls.data && urls.data.length === 0 && (
        <Card shadow='md'>
          <Center>
            <Group>
              <div>
                <IconLink size={48} />
              </div>
              <div>
                <Title>Nothing here</Title>
                <MutedText size='md'>Create a link to get started!</MutedText>
              </div>
            </Group>
          </Center>
        </Card>
      )}

      {listView ? (
        <DataTable
          withBorder
          borderRadius='md'
          highlightOnHover
          verticalSpacing='sm'
          columns={[
            { accessor: 'id', title: 'ID', sortable: true },
            {
              accessor: 'vanity',
              title: 'Vanity',
              sortable: true,
              render: (url) => <Text>{url.vanity ?? ''}</Text>,
            },
            {
              accessor: 'destination',
              title: 'URL',
              sortable: true,
              render: (url) => (
                <AnchorNext href={url.url} target='_blank'>
                  {url.destination}
                </AnchorNext>
              ),
            },
            {
              accessor: 'views',
              sortable: true,
            },
            {
              accessor: 'maxViews',
              sortable: true,
            },
            {
              accessor: 'actions',
              textAlignment: 'right',
              render: (url) => (
                <Group spacing={4} position='right' noWrap>
                  <Tooltip label='Open link in a new tab'>
                    <ActionIcon
                      onClick={() => window.open(url.url, '_blank')}
                      variant='subtle'
                      color='primary'
                    >
                      <IconExternalLink size='1rem' />
                    </ActionIcon>
                  </Tooltip>
                  <Tooltip label='Copy link to clipboard'>
                    <ActionIcon onClick={() => copyURL(url)} variant='subtle' color='primary'>
                      <IconClipboardCopy size='1rem' />
                    </ActionIcon>
                  </Tooltip>
                  <Tooltip label='Delete URL'>
                    <ActionIcon onClick={() => deleteURL(url)} variant='subtle' color='red'>
                      <IconLinkOff size='1rem' />
                    </ActionIcon>
                  </Tooltip>
                </Group>
              ),
            },
          ]}
          sortStatus={sortStatus}
          onSortStatusChange={setSortStatus}
          records={records ?? []}
          fetching={urls.isLoading}
          minHeight={160}
          loaderBackgroundBlur={5}
          loaderVariant='dots'
          rowContextMenu={{
            shadow: 'xl',
            borderRadius: 'md',
            items: (url) => [
              {
                key: 'openLink',
                title: 'Open link in a new tab',
                icon: <IconExternalLink size='1rem' />,
                onClick: () => window.open(url.url, '_blank'),
              },
              {
                key: 'copyLink',
                title: 'Copy link to clipboard',
                icon: <IconClipboardCopy size='1rem' />,
                onClick: () => copyURL(url),
              },
              {
                key: 'deleteURL',
                title: 'Delete URL',
                icon: <IconLinkOff size='1rem' />,
                onClick: () => deleteURL(url),
              },
            ],
          }}
        />
      ) : (
        <SimpleGrid cols={4} spacing='lg' breakpoints={[{ maxWidth: 'sm', cols: 1, spacing: 'sm' }]}>
          {urls.isLoading || !urls.data
            ? [1, 2, 3, 4].map((x) => <Skeleton key={x} width='100%' height={80} radius='sm' />)
            : urls.data.map((url) => (
                <URLCard key={url.id} url={url} deleteURL={deleteURL} copyURL={copyURL} />
              ))}
        </SimpleGrid>
      )}
    </>
  );
}
