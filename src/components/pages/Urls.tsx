import { ActionIcon, Button, Card, Group, Modal, SimpleGrid, Skeleton, TextInput, Title } from '@mantine/core';
import { useClipboard } from '@mantine/hooks';
import { useForm } from '@mantine/form';
import { showNotification } from '@mantine/notifications';
import { CopyIcon, CrossIcon, DeleteIcon, LinkIcon, PlusIcon } from 'components/icons';
import useFetch from 'hooks/useFetch';
import { useStoreSelector } from 'lib/redux/store';
import { useEffect, useState } from 'react';

export default function Urls() {
  const user = useStoreSelector(state => state.user);
  const clipboard = useClipboard();

  const [urls, setURLS] = useState([]);
  const [createOpen, setCreateOpen] = useState(false);

  const updateURLs = async () => {
    const urls = await useFetch('/api/user/urls');

    setURLS(urls);
  };

  const deleteURL = async u => {
    const url = await useFetch('/api/user/urls', 'DELETE', { id: u.id });
    if (url.error) {
      showNotification({
        title: 'Failed to delete URL',
        message: url.error,
        icon: <DeleteIcon />,
        color: 'red',
      });
    } else {
      showNotification({
        title: 'Deleted URL',
        message: '',
        icon: <CrossIcon />,
        color: 'green',
      });
    }

    updateURLs();
  };

  const copyURL = u => {
    clipboard.copy(`${window.location.protocol}//${window.location.host}${u.url}`);
    showNotification({
      title: 'Copied to clipboard',
      message: '',
      icon: <CopyIcon />,
    });
  };

  const form = useForm({
    initialValues: {
      url: '',
      vanity: '',
    },
  });

  const onSubmit = async values => {
    const cleanURL = values.url.trim();
    const cleanVanity = values.vanity.trim();

    if (cleanURL === '') return form.setFieldError('url', 'URL can\'t be nothing');

    try {
      new URL(cleanURL);
    } catch (e) {
      return form.setFieldError('url', 'Invalid URL');
    }

    const data = {
      url: cleanURL,
      vanity: cleanVanity === '' ? null : cleanVanity,
    };

    setCreateOpen(false);
    const res = await fetch('/api/shorten', {
      method: 'POST',
      headers: {
        'Authorization': user.token,
        'Content-Type': 'application/json',
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
      showNotification({
        title: 'URL shortened',
        message: json.url,
        color: 'green',
        icon: <LinkIcon />,
      });
    }

    updateURLs();
  };

  useEffect(() => {
    updateURLs();
  }, []);

  return (
    <>
      <Modal
        opened={createOpen}
        onClose={() => setCreateOpen(false)}
        title={<Title>Shorten URL</Title>}
      >
        <form onSubmit={form.onSubmit((v) => onSubmit(v))}>
          <TextInput id='url' label='URL' {...form.getInputProps('url')} />
          <TextInput id='vanity' label='Vanity' {...form.getInputProps('vanity')} />

          <Group position='right' mt={22}>
            <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button type='submit'>Submit</Button>
          </Group>
        </form>
      </Modal>

      <Group mb='md'>
        <Title>URLs</Title>
        <ActionIcon variant='filled' color='primary' onClick={() => setCreateOpen(true)}><PlusIcon /></ActionIcon>
      </Group>

      <SimpleGrid
        cols={4}
        spacing='lg'
        breakpoints={[
          { maxWidth: 'sm', cols: 1, spacing: 'sm' },
        ]}
      >
        {urls.length ? urls.map(url => (
          <Card key={url.id} sx={{ maxWidth: '100%' }} shadow='sm'>
            <Group position='apart'>
              <Group position='left'>
                <Title>{url.vanity ?? url.id}</Title>
              </Group>
              <Group position='right'>
                <ActionIcon href={url.url} component='a' target='_blank'><LinkIcon /></ActionIcon>
                <ActionIcon aria-label='copy' onClick={() => copyURL(url)}>
                  <CopyIcon />
                </ActionIcon>
                <ActionIcon aria-label='delete' onClick={() => deleteURL(url)}>
                  <DeleteIcon />
                </ActionIcon>
              </Group>
            </Group>
          </Card>
        )) : [1, 2, 3, 4].map(x => (
          <Skeleton key={x} width='100%' height={80} radius='sm' />
        ))}
      </SimpleGrid>
    </>
  );
}