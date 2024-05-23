import GridTableSwitcher from '@/components/GridTableSwitcher';
import { Response } from '@/lib/api/response';
import { fetchApi } from '@/lib/fetchApi';
import { useViewStore } from '@/lib/store/view';
import {
  ActionIcon,
  Anchor,
  Button,
  Group,
  Modal,
  NumberInput,
  PasswordInput,
  Stack,
  TextInput,
  Title,
  Tooltip,
} from '@mantine/core';
import { hasLength, useForm } from '@mantine/form';
import { useClipboard } from '@mantine/hooks';
import { modals } from '@mantine/modals';
import { notifications } from '@mantine/notifications';
import { IconClipboardCopy, IconExternalLink, IconLink, IconLinkOff } from '@tabler/icons-react';
import Link from 'next/link';
import { useState } from 'react';
import { mutate } from 'swr';
import UrlGridView from './views/UrlGridView';
import UrlTableView from './views/UrlTableView';

export default function DashboardURLs() {
  const clipboard = useClipboard();
  const view = useViewStore((state) => state.urls);

  const [open, setOpen] = useState(false);

  const form = useForm<{
    url: string;
    vanity: string;
    maxViews: '' | number;
    password: string;
  }>({
    initialValues: {
      url: '',
      vanity: '',
      maxViews: '',
      password: '',
    },
    validate: {
      url: hasLength({ min: 1 }, 'URL is required'),
    },
  });

  const onSubmit = async (values: typeof form.values) => {
    if (URL.canParse(values.url) === false) return form.setFieldError('url', 'Invalid URL');

    const { data, error } = await fetchApi<Extract<Response['/api/user/urls'], { url: string }>>(
      '/api/user/urls',
      'POST',
      {
        destination: values.url,
        vanity: values.vanity.trim() || null,
      },
      {
        ...(values.maxViews !== '' && { 'x-zipline-max-views': String(values.maxViews) }),
        ...(values.password !== '' && { 'x-zipline-password': values.password }),
      },
    );

    if (error) {
      notifications.show({
        title: 'Failed to shorten URL',
        message: error.message,
        color: 'red',
        icon: <IconLinkOff size='1rem' />,
      });
    } else {
      setOpen(false);

      const open = () => window.open(data?.url, '_blank');
      const copy = () => {
        clipboard.copy(data?.url);
        notifications.show({
          title: 'Copied URL to clipboard',
          message: (
            <Anchor component={Link} href={data?.url ?? ''} target='_blank'>
              {data?.url}
            </Anchor>
          ),
          color: 'blue',
          icon: <IconClipboardCopy size='1rem' />,
        });
      };

      modals.open({
        title: <Title>Shortened URL</Title>,
        size: 'auto',
        children: (
          <Group justify='space-between'>
            <Group justify='left'>
              <Anchor component={Link} href={data?.url ?? ''}>
                {data?.url}
              </Anchor>
            </Group>
            <Group justify='right'>
              <Tooltip label='Open link in a new tab'>
                <ActionIcon onClick={() => open()} variant='filled' color='primary'>
                  <IconExternalLink size='1rem' />
                </ActionIcon>
              </Tooltip>
              <Tooltip label='Copy link to clipboard'>
                <ActionIcon onClick={() => copy()} variant='filled' color='primary'>
                  <IconClipboardCopy size='1rem' />
                </ActionIcon>
              </Tooltip>
            </Group>
          </Group>
        ),
      });

      mutate('/api/user/urls');
      form.reset();
    }
  };

  return (
    <>
      <Modal centered opened={open} onClose={() => setOpen(false)} title={<Title>Shorten a URL</Title>}>
        <form onSubmit={form.onSubmit(onSubmit)}>
          <Stack gap='sm'>
            <TextInput label='URL' placeholder='https://example.com' {...form.getInputProps('url')} />
            <TextInput
              label='Vanity'
              description='Optional field, leave blank to generate a random code'
              placeholder='example'
              {...form.getInputProps('vanity')}
            />

            <NumberInput
              label='Max views'
              description='Optional field, leave blank to disable a view limit.'
              min={0}
              {...form.getInputProps('maxViews')}
            />

            <PasswordInput
              label='Password'
              description='Protect your link with a password'
              {...form.getInputProps('password')}
            />

            <Button type='submit' variant='outline' radius='sm' leftSection={<IconLink size='1rem' />}>
              Create
            </Button>
          </Stack>
        </form>
      </Modal>

      <Group>
        <Title>URLs</Title>

        <Tooltip label='Shorten a URL'>
          <ActionIcon variant='outline' onClick={() => setOpen(true)}>
            <IconLink size='1rem' />
          </ActionIcon>
        </Tooltip>

        <GridTableSwitcher type='urls' />
      </Group>

      {view === 'grid' ? <UrlGridView /> : <UrlTableView />}
    </>
  );
}
