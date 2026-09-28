import DomainSelect from '@/components/DomainSelect';
import GridTableSwitcher from '@/components/GridTableSwitcher';
import { Response } from '@/lib/api/response';
import { useViewStore } from '@/lib/client/store/view';
import { Url } from '@/lib/db/models/url';
import { fetchApi } from '@/lib/fetchApi';
import {
  ActionIcon,
  Anchor,
  Button,
  Group,
  Modal,
  NumberInput,
  PasswordInput,
  Stack,
  Switch,
  Text,
  TextInput,
  Title,
  Tooltip,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useClipboard } from '@mantine/hooks';
import { modals } from '@mantine/modals';
import { notifications } from '@mantine/notifications';
import {
  IconClipboardCopy,
  IconExternalLink,
  IconEyeFilled,
  IconKey,
  IconLink,
  IconLinkOff,
  IconLinkPlus,
  IconTextCaption,
} from '@tabler/icons-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { mutate } from 'swr';
import UrlGridView from './views/UrlGridView';
import UrlTableView from './views/UrlTableView';

export default function DashboardURLs() {
  const { t } = useTranslation(['urls', 'common']);
  const clipboard = useClipboard();
  const view = useViewStore((state) => state.urls);

  const [open, setOpen] = useState(false);

  const form = useForm<{
    url: string;
    vanity: string;
    maxViews: '' | number;
    password: string;
    enabled: boolean;
    domain: '' | string;
  }>({
    initialValues: {
      url: '',
      vanity: '',
      maxViews: '',
      password: '',
      enabled: true,
      domain: '',
    },
    validate: {
      url: (value) => (value.length < 1 ? t('create.url.required') : null),
    },
  });

  const onSubmit = async (values: typeof form.values) => {
    if (URL.canParse(values.url) === false) return form.setFieldError('url', t('create.url.invalid'));

    const { data, error } = await fetchApi<
      Extract<
        Response['/api/user/urls'],
        {
          url: string;
        } & Omit<Url, 'password'>
      >
    >(
      '/api/user/urls',
      'POST',
      {
        destination: values.url,
        vanity: values.vanity.trim() || null,
        enabled: values.enabled ?? true,
      },
      {
        ...(values.maxViews !== '' && { 'x-zipline-max-views': String(values.maxViews) }),
        ...(values.password !== '' && { 'x-zipline-password': values.password }),
        ...(values.domain !== '' && { 'x-zipline-domain': values.domain }),
      },
    );

    if (error) {
      notifications.show({
        title: t('notifications.shortenFailed.title'),
        message: error.error,
        color: 'red',
        icon: <IconLinkOff size='1rem' />,
      });
    } else {
      setOpen(false);

      const open = () => (values.enabled ? window.open(data?.url, '_blank') : null);
      const copy = () => {
        if (!values.enabled) return;

        clipboard.copy(data?.url);
        notifications.show({
          title: t('notifications.copied.title'),
          message: (
            <Anchor component={Link} to={data?.url ?? ''} target='_blank'>
              {data?.url}
            </Anchor>
          ),
          color: 'blue',
          icon: <IconClipboardCopy size='1rem' />,
        });
      };

      modals.open({
        title: t('shortened.title'),
        size: 'auto',
        children: (
          <Group justify='space-between'>
            <Group justify='left'>
              {data?.enabled ? (
                <Anchor component={Link} to={data?.url ?? ''}>
                  {data?.url}
                </Anchor>
              ) : (
                <Text>{data?.url}</Text>
              )}
            </Group>
            <Group justify='right'>
              {data?.enabled && (
                <Tooltip label={t('shortened.open')}>
                  <ActionIcon onClick={() => open()} variant='filled'>
                    <IconExternalLink size='1rem' />
                  </ActionIcon>
                </Tooltip>
              )}
              <Tooltip label={t('shortened.copy')}>
                <ActionIcon onClick={() => copy()} variant='filled'>
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
      <Modal centered opened={open} onClose={() => setOpen(false)} title={t('create.title')}>
        <form onSubmit={form.onSubmit(onSubmit)}>
          <Stack gap='sm'>
            <TextInput
              label={t('create.url.label')}
              placeholder='https://example.com'
              leftSection={<IconLink size='1rem' />}
              {...form.getInputProps('url')}
            />
            <TextInput
              label={t('create.vanity.label')}
              description={t('create.vanity.description')}
              placeholder='example'
              leftSection={<IconTextCaption size='1rem' />}
              {...form.getInputProps('vanity')}
            />

            <NumberInput
              label={t('create.maxViews.label')}
              description={t('create.maxViews.description')}
              min={0}
              leftSection={<IconEyeFilled size='1rem' />}
              {...form.getInputProps('maxViews')}
            />

            <DomainSelect label={t('create.domain.label')} {...form.getInputProps('domain')} />

            <Switch
              label={t('create.enabled.label')}
              description={t('create.enabled.description')}
              {...form.getInputProps('enabled', { type: 'checkbox' })}
            />

            <PasswordInput
              label={t('create.password.label')}
              description={t('create.password.description')}
              autoComplete='off'
              leftSection={<IconKey size='1rem' />}
              {...form.getInputProps('password')}
            />

            <Button type='submit' variant='outline' leftSection={<IconLink size='1rem' />}>
              {t('common:actions.create')}
            </Button>
          </Stack>
        </form>
      </Modal>

      <Group>
        <Title>{t('title')}</Title>

        <Button
          variant='outline'
          size='compact-sm'
          leftSection={<IconLinkPlus size='1rem' />}
          onClick={() => setOpen(true)}
        >
          {t('common:actions.create')}
        </Button>

        <GridTableSwitcher type='urls' />
      </Group>

      {view === 'grid' ? <UrlGridView /> : <UrlTableView />}
    </>
  );
}
