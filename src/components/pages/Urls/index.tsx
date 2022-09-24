import { ActionIcon, Button, Group, Modal, SimpleGrid, Skeleton, TextInput, Title, Card, Center } from '@mantine/core';
import { useForm } from '@mantine/form';
import { showNotification } from '@mantine/notifications';
import { CrossIcon, LinkIcon, PlusIcon } from 'components/icons';
import { useStoreSelector } from 'lib/redux/store';
import { useEffect, useState } from 'react';
import { useURLs } from 'lib/queries/url';
import URLCard from './URLCard';
import MutedText from 'components/MutedText';

export default function Urls() {
  const user = useStoreSelector(state => state.user);

  const urls = useURLs();
  const [createOpen, setCreateOpen] = useState(false);

  const updateURLs = async () => urls.refetch();

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

      {
        (urls.data && urls.data.length === 0) && (
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
        )
      }

      <SimpleGrid
        cols={4}
        spacing='lg'
        breakpoints={[
          { maxWidth: 'sm', cols: 1, spacing: 'sm' },
        ]}
      >
        {
          (urls.isLoading || !urls.data) ? 
            [1, 2, 3, 4].map(x => (
              <Skeleton key={x} width='100%' height={80} radius='sm' />
            ))
            : urls.data.map(url => (
              <URLCard key={url.id} url={url} />
            ))
        }
      </SimpleGrid>
    </>
  );
}