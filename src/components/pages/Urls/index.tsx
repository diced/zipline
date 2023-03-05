import {
  ActionIcon,
  Button,
  Card,
  Center,
  Group,
  Modal,
  NumberInput,
  SimpleGrid,
  Skeleton,
  TextInput,
  Title,
  Tooltip,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useClipboard } from '@mantine/hooks';
import { useModals } from '@mantine/modals';
import { showNotification } from '@mantine/notifications';
import { CopyIcon, CrossIcon, LinkIcon, PlusIcon } from 'components/icons';
import Link from 'components/Link';
import MutedText from 'components/MutedText';
import { useURLs } from 'lib/queries/url';
import { userSelector } from 'lib/recoil/user';
import { useEffect, useState } from 'react';
import { useRecoilValue } from 'recoil';
import URLCard from './URLCard';

export default function Urls() {
  const user = useRecoilValue(userSelector);

  const modals = useModals();
  const clipboard = useClipboard();

  const urls = useURLs();
  const [createOpen, setCreateOpen] = useState(false);

  const updateURLs = async () => urls.refetch();

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
      message: <Link href={url}>{url}</Link>,
      color: 'green',
      icon: <CopyIcon />,
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
        icon: <CrossIcon />,
      });
    } else {
      modals.openModal({
        title: <Title>Shortened URL!</Title>,
        size: 'auto',
        children: (
          <Group position='apart'>
            <Group position='left'>
              <Link href={json.url}>{data.vanity ?? json.url}</Link>
            </Group>
            <Group position='right'>
              <Tooltip label='Open link in a new tab'>
                <ActionIcon onClick={() => window.open(json.url, '_blank')} variant='filled' color='primary'>
                  <LinkIcon />
                </ActionIcon>
              </Tooltip>
              <Tooltip label='Copy link to clipboard'>
                <ActionIcon onClick={() => copy(json.url)} variant='filled' color='primary'>
                  <CopyIcon />
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
          <PlusIcon />
        </ActionIcon>
      </Group>

      {urls.data && urls.data.length === 0 && (
        <Card shadow='md'>
          <Center>
            <Group>
              <div>
                <LinkIcon size={48} />
              </div>
              <div>
                <Title>Nothing here</Title>
                <MutedText size='md'>Create a link to get started!</MutedText>
              </div>
            </Group>
          </Center>
        </Card>
      )}

      <SimpleGrid cols={4} spacing='lg' breakpoints={[{ maxWidth: 'sm', cols: 1, spacing: 'sm' }]}>
        {urls.isLoading || !urls.data
          ? [1, 2, 3, 4].map((x) => <Skeleton key={x} width='100%' height={80} radius='sm' />)
          : urls.data.map((url) => <URLCard key={url.id} url={url} />)}
      </SimpleGrid>
    </>
  );
}
