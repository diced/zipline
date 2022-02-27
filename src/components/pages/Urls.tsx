import React, { useEffect, useState } from 'react';

import useFetch from 'hooks/useFetch';
import { useStoreSelector } from 'lib/redux/store';
import { useClipboard, useForm } from '@mantine/hooks';
import { CopyIcon, Cross1Icon, Link1Icon, PlusIcon, TrashIcon } from '@modulz/radix-icons';
import { useNotifications } from '@mantine/notifications';
import { Modal, Title, Group, Button, Box, Card, TextInput, ActionIcon, SimpleGrid, Skeleton } from '@mantine/core';

export default function Urls() {
  const user = useStoreSelector(state => state.user);
  const notif = useNotifications();
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
      notif.showNotification({
        title: 'Failed to delete URL',
        message: url.error,
        icon: <TrashIcon />,
        color: 'red',
      });
    } else {
      notif.showNotification({
        title: 'Deleted URL',
        message: '',
        icon: <Cross1Icon />,
        color: 'green',
      });
    }

    updateURLs();
  };

  const copyURL = u => {
    clipboard.copy(`${window.location.protocol}//${window.location.host}${u.url}`);
    notif.showNotification({
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

  const onSubmit = async (values) => {
    const cleanURL = values.url.trim();
    const cleanVanity = values.vanity.trim();

    if (cleanURL === '') return form.setFieldError('url', 'URL can\'t be nothing');

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
      notif.showNotification({
        title: 'Failed to create URL',
        message: json.error,
        color: 'red',
        icon: <Cross1Icon />,
      });
    } else {
      notif.showNotification({
        title: 'URL shortened',
        message: json.url,
        color: 'green',
        icon: <Link1Icon />,
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

      <Group>
        <Title sx={{ marginBottom: 12 }}>URLs</Title>
        <ActionIcon variant='filled' color='primary' onClick={() => setCreateOpen(true)}><PlusIcon/></ActionIcon>
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
                <ActionIcon href={url.url} component='a' target='_blank'><Link1Icon/></ActionIcon>
                <ActionIcon aria-label='copy' onClick={() => copyURL(url)}>
                  <CopyIcon />
                </ActionIcon>
                <ActionIcon aria-label='delete' onClick={() => deleteURL(url)}>
                  <TrashIcon />
                </ActionIcon>
              </Group>
            </Group>
          </Card>
        )) : [1,2,3,4,5,6,7].map(x => (
          <div key={x}>
            <Skeleton width='100%' height={60} sx={{ borderRadius: 1 }}/>
          </div>
        ))}
      </SimpleGrid>
    </>
  );
}