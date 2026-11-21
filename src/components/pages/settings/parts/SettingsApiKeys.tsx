import { Response } from '@/lib/api/response';
import { fetchApi } from '@/lib/fetchApi';
import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Checkbox,
  Code,
  CopyButton,
  Group,
  Modal,
  Paper,
  ScrollArea,
  SimpleGrid,
  Skeleton,
  Stack,
  Text,
  TextInput,
  Title,
  Tooltip,
} from '@mantine/core';
import { DateTimePicker } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { modals } from '@mantine/modals';
import { notifications } from '@mantine/notifications';
import {
  IconAlertTriangle,
  IconCheck,
  IconCopy,
  IconKey,
  IconPlus,
  IconShieldLock,
  IconTrash,
} from '@tabler/icons-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import useSWR from 'swr';

type ApiKeyList = Extract<Response['/api/user/api-keys'], any[]>;
type CreatedApiKey = Extract<Response['/api/user/api-keys'], { token: string }>;

const SCOPE_GROUPS = [
  { name: 'files', scopes: ['files:read', 'files:write'] },
  { name: 'urls', scopes: ['urls:read', 'urls:write'] },
] as const;

export default function SettingsApiKeys() {
  const { t } = useTranslation(['settings', 'common']);
  const { data, error, isLoading, mutate } = useSWR<ApiKeyList>('/api/user/api-keys');
  const [createOpen, setCreateOpen] = useState(false);
  const [created, setCreated] = useState<CreatedApiKey | null>(null);
  const [now] = useState(() => new Date());

  const form = useForm({
    initialValues: {
      name: '',
      scopes: [] as string[],
      expiresAt: null as Date | null,
    },
    validate: {
      name: (value) => (value.trim() ? null : t('apiKeys.create.nameRequired')),
      scopes: (value) => (value.length ? null : t('apiKeys.create.scopeRequired')),
    },
  });

  const createKey = form.onSubmit(async (values) => {
    const { data: key, error: createError } = await fetchApi<CreatedApiKey>('/api/user/api-keys', 'POST', {
      name: values.name.trim(),
      scopes: values.scopes,
      expiresAt: values.expiresAt?.toISOString() ?? null,
    });

    if (!key || createError) {
      notifications.show({
        title: t('apiKeys.notifications.createFailed'),
        message: createError?.error,
        color: 'red',
      });
      return;
    }

    setCreateOpen(false);
    setCreated(key);
    form.reset();
    await mutate();
  });

  const revokeKey = (key: ApiKeyList[number]) => {
    modals.openConfirmModal({
      title: t('apiKeys.revoke.title', { name: key.name }),
      children: <Text size='sm'>{t('apiKeys.revoke.message')}</Text>,
      labels: { cancel: t('common:actions.cancel'), confirm: t('apiKeys.revoke.confirm') },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        const { error: revokeError } = await fetchApi('/api/user/api-keys', 'DELETE', { id: key.id });
        if (revokeError) {
          notifications.show({
            title: t('apiKeys.notifications.revokeFailed'),
            message: revokeError.error,
            color: 'red',
          });
          return;
        }

        notifications.show({ message: t('apiKeys.notifications.revoked'), color: 'green' });
        await mutate();
      },
    });
  };

  return (
    <>
      <Modal
        opened={createOpen}
        onClose={() => setCreateOpen(false)}
        title={t('apiKeys.create.title')}
        size='lg'
      >
        <form onSubmit={createKey}>
          <Stack gap='md'>
            <TextInput
              label={t('apiKeys.create.name')}
              description={t('apiKeys.create.nameDescription')}
              placeholder={t('apiKeys.create.namePlaceholder')}
              leftSection={<IconKey size='1rem' />}
              autoFocus
              {...form.getInputProps('name')}
            />

            <div>
              <Text fw={500} size='sm'>
                {t('apiKeys.create.permissions')}
              </Text>
              <Text c='dimmed' size='xs' mb='xs'>
                {t('apiKeys.create.permissionsDescription')}
              </Text>
              <SimpleGrid cols={{ base: 1, sm: 2 }} spacing='sm'>
                {SCOPE_GROUPS.map((group) => (
                  <Paper withBorder p='sm' key={group.name}>
                    <Text fw={600} size='sm' mb='xs'>
                      {t(`apiKeys.groups.${group.name}`)}
                    </Text>
                    <Stack gap='xs'>
                      {group.scopes.map((scope) => (
                        <Checkbox
                          key={scope}
                          value={scope}
                          label={t(`apiKeys.scopes.${scope}.label`)}
                          description={t(`apiKeys.scopes.${scope}.description`)}
                          checked={form.values.scopes.includes(scope)}
                          onChange={(event) => {
                            const next = event.currentTarget.checked
                              ? [...form.values.scopes, scope]
                              : form.values.scopes.filter((value) => value !== scope);
                            form.setFieldValue('scopes', next);
                          }}
                        />
                      ))}
                    </Stack>
                  </Paper>
                ))}
              </SimpleGrid>
              {form.errors.scopes && (
                <Text c='red' size='xs' mt={4}>
                  {form.errors.scopes}
                </Text>
              )}
            </div>

            <DateTimePicker
              clearable
              label={t('apiKeys.create.expiresAt')}
              description={t('apiKeys.create.expiresAtDescription')}
              minDate={now}
              {...form.getInputProps('expiresAt')}
            />

            <Group justify='flex-end'>
              <Button variant='default' onClick={() => setCreateOpen(false)}>
                {t('common:actions.cancel')}
              </Button>
              <Button type='submit' leftSection={<IconPlus size='1rem' />} loading={form.submitting}>
                {t('apiKeys.create.submit')}
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      <Modal
        opened={!!created}
        onClose={() => setCreated(null)}
        title={t('apiKeys.secret.title')}
        size='lg'
        closeOnClickOutside={false}
      >
        {created && (
          <Stack gap='md'>
            <Alert
              color='yellow'
              icon={<IconAlertTriangle size='1rem' />}
              title={t('apiKeys.secret.warning')}
            >
              {t('apiKeys.secret.description')}
            </Alert>
            <ScrollArea type='auto' offsetScrollbars>
              <Code block>{created.token}</Code>
            </ScrollArea>
            <CopyButton value={created.token} timeout={1600}>
              {({ copied, copy }) => (
                <Button
                  onClick={copy}
                  color={copied ? 'green' : undefined}
                  leftSection={copied ? <IconCheck size='1rem' /> : <IconCopy size='1rem' />}
                >
                  {copied ? t('apiKeys.secret.copied') : t('apiKeys.secret.copy')}
                </Button>
              )}
            </CopyButton>
          </Stack>
        )}
      </Modal>

      <Paper withBorder p='sm'>
        <Group justify='space-between' align='flex-start' gap='md'>
          <div>
            <Title order={2}>{t('apiKeys.title')}</Title>
            <Text c='dimmed' size='sm'>
              {t('apiKeys.description')}
            </Text>
          </div>
          <Button leftSection={<IconPlus size='1rem' />} onClick={() => setCreateOpen(true)}>
            {t('apiKeys.create.button')}
          </Button>
        </Group>

        {error ? (
          <Alert color='red' mt='md' title={t('apiKeys.loadError')}>
            {error.message}
          </Alert>
        ) : isLoading ? (
          <Stack mt='md' gap='xs'>
            <Skeleton h={74} />
            <Skeleton h={74} />
          </Stack>
        ) : data?.length ? (
          <Stack mt='md' gap='xs'>
            {data.map((key) => {
              const expired = !!key.expiresAt && new Date(key.expiresAt) <= now;
              const status = key.revokedAt ? 'revoked' : expired ? 'expired' : 'active';
              return (
                <Paper withBorder p='sm' key={key.id}>
                  <Group justify='space-between' wrap='nowrap' align='flex-start'>
                    <div style={{ minWidth: 0 }}>
                      <Group gap='xs'>
                        <Text fw={600} truncate>
                          {key.name}
                        </Text>
                        <Badge color={status === 'active' ? 'green' : 'gray'} variant='light'>
                          {t(`apiKeys.status.${status}`)}
                        </Badge>
                      </Group>
                      <Text c='dimmed' size='xs' mt={2}>
                        {t('apiKeys.prefix', { prefix: key.prefix })}
                      </Text>
                      <Group gap={6} mt='xs'>
                        {key.scopes.map((scope) => (
                          <Badge key={scope} variant='outline' color='gray' size='sm'>
                            {t(`apiKeys.scopes.${scope}.short`)}
                          </Badge>
                        ))}
                      </Group>
                      <Text c='dimmed' size='xs' mt='xs'>
                        {key.lastUsedAt
                          ? t('apiKeys.lastUsed', { date: new Date(key.lastUsedAt).toLocaleString() })
                          : t('apiKeys.neverUsed')}
                        {' | '}
                        {key.expiresAt
                          ? t('apiKeys.expires', { date: new Date(key.expiresAt).toLocaleString() })
                          : t('apiKeys.neverExpires')}
                      </Text>
                    </div>
                    <Tooltip label={t('apiKeys.revoke.button')}>
                      <ActionIcon
                        color='red'
                        variant='subtle'
                        disabled={!!key.revokedAt}
                        onClick={() => revokeKey(key)}
                        aria-label={t('apiKeys.revoke.button')}
                      >
                        <IconTrash size='1rem' />
                      </ActionIcon>
                    </Tooltip>
                  </Group>
                </Paper>
              );
            })}
          </Stack>
        ) : (
          <Stack align='center' gap={4} py='xl'>
            <IconShieldLock size='2rem' stroke={1.5} />
            <Text fw={600}>{t('apiKeys.empty.title')}</Text>
            <Text c='dimmed' size='sm' ta='center'>
              {t('apiKeys.empty.description')}
            </Text>
          </Stack>
        )}
      </Paper>
    </>
  );
}
