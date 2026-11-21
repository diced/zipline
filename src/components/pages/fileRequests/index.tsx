import { Response } from '@/lib/api/response';
import { bytes } from '@/lib/bytes';
import { useFolders } from '@/lib/client/hooks/useFolders';
import { fetchApi } from '@/lib/fetchApi';
import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  CopyButton,
  Group,
  Modal,
  NumberInput,
  Paper,
  PasswordInput,
  Select,
  SimpleGrid,
  Skeleton,
  Stack,
  Switch,
  Text,
  Textarea,
  TextInput,
  Title,
  Tooltip,
} from '@mantine/core';
import { DateTimePicker } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { modals } from '@mantine/modals';
import { notifications } from '@mantine/notifications';
import {
  IconCheck,
  IconClipboardCopy,
  IconEdit,
  IconFileArrowRight,
  IconPlus,
  IconTrash,
} from '@tabler/icons-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import useSWR from 'swr';

type FileRequestList = Extract<Response['/api/user/file-requests'], any[]>;
type FileRequest = FileRequestList[number];

type FormValues = {
  name: string;
  description: string;
  enabled: boolean;
  password: string;
  removePassword: boolean;
  expiresAt: Date | null;
  maxFiles: number | string;
  maxMegabytes: number | string;
  allowedTypes: string;
  folderId: string | null;
};

const initialValues: FormValues = {
  name: '',
  description: '',
  enabled: true,
  password: '',
  removePassword: false,
  expiresAt: null,
  maxFiles: '',
  maxMegabytes: '',
  allowedTypes: '',
  folderId: null,
};

export default function DashboardFileRequests() {
  const { t } = useTranslation(['fileRequests', 'common']);
  const { data, error, isLoading, mutate } = useSWR<FileRequestList>('/api/user/file-requests');
  const { data: folders } = useFolders();
  const [editing, setEditing] = useState<FileRequest | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [now] = useState(() => new Date());

  const form = useForm<FormValues>({
    initialValues,
    validate: { name: (value) => (value.trim() ? null : t('form.nameRequired')) },
  });

  const openCreate = () => {
    setEditing(null);
    form.setValues(initialValues);
    form.resetDirty();
    setModalOpen(true);
  };

  const openEdit = (request: FileRequest) => {
    setEditing(request);
    form.setValues({
      name: request.name,
      description: request.description ?? '',
      enabled: request.enabled,
      password: '',
      removePassword: false,
      expiresAt: request.expiresAt ? new Date(request.expiresAt) : null,
      maxFiles: request.maxFiles ?? '',
      maxMegabytes: request.maxBytes ? request.maxBytes / 1024 / 1024 : '',
      allowedTypes: request.allowedTypes.join(', '),
      folderId: request.folderId,
    });
    form.resetDirty();
    setModalOpen(true);
  };

  const submit = form.onSubmit(async (values) => {
    const payload = {
      name: values.name.trim(),
      description: values.description.trim() || null,
      enabled: values.enabled,
      expiresAt: values.expiresAt?.toISOString() ?? null,
      maxFiles: values.maxFiles === '' ? null : Number(values.maxFiles),
      maxBytes: values.maxMegabytes === '' ? null : Math.round(Number(values.maxMegabytes) * 1024 * 1024),
      allowedTypes: values.allowedTypes
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean),
      folderId: values.folderId || null,
      ...(values.removePassword ? { password: null } : values.password ? { password: values.password } : {}),
    };

    const route = editing ? `/api/user/file-requests/${editing.id}` : '/api/user/file-requests';
    const { error: saveError } = await fetchApi(route, editing ? 'PATCH' : 'POST', payload);
    if (saveError) {
      notifications.show({
        title: t('notifications.saveFailed'),
        message: saveError.error,
        color: 'red',
      });
      return;
    }

    notifications.show({
      message: t(editing ? 'notifications.updated' : 'notifications.created'),
      color: 'green',
    });
    setModalOpen(false);
    await mutate();
  });

  const remove = (request: FileRequest) => {
    modals.openConfirmModal({
      title: t('delete.title', { name: request.name }),
      children: <Text size='sm'>{t('delete.description')}</Text>,
      confirmProps: { color: 'red' },
      labels: { cancel: t('common:actions.cancel'), confirm: t('delete.confirm') },
      onConfirm: async () => {
        const { error: deleteError } = await fetchApi(`/api/user/file-requests/${request.id}`, 'DELETE');
        if (deleteError) {
          notifications.show({
            title: t('notifications.deleteFailed'),
            message: deleteError.error,
            color: 'red',
          });
          return;
        }
        notifications.show({ message: t('notifications.deleted'), color: 'green' });
        await mutate();
      },
    });
  };

  return (
    <>
      <Modal
        opened={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? t('form.editTitle') : t('form.createTitle')}
        size='lg'
      >
        <form onSubmit={submit}>
          <Stack gap='md'>
            <TextInput
              label={t('form.name')}
              placeholder={t('form.namePlaceholder')}
              {...form.getInputProps('name')}
            />
            <Textarea
              label={t('form.description')}
              description={t('form.descriptionHelp')}
              autosize
              minRows={2}
              maxRows={5}
              {...form.getInputProps('description')}
            />
            <Select
              clearable
              searchable
              label={t('form.folder')}
              description={t('form.folderHelp')}
              placeholder={t('form.rootFolder')}
              data={(folders ?? []).map((folder) => ({ value: folder.id, label: folder.name }))}
              {...form.getInputProps('folderId')}
            />
            <SimpleGrid cols={{ base: 1, sm: 2 }}>
              <NumberInput
                label={t('form.maxFiles')}
                description={t('form.optionalLimit')}
                min={1}
                max={1000}
                allowDecimal={false}
                {...form.getInputProps('maxFiles')}
              />
              <NumberInput
                label={t('form.maxSize')}
                description={t('form.optionalLimit')}
                min={1}
                suffix=' MB'
                {...form.getInputProps('maxMegabytes')}
              />
            </SimpleGrid>
            <TextInput
              label={t('form.allowedTypes')}
              description={t('form.allowedTypesHelp')}
              placeholder='png, jpg, application/pdf, image/*'
              {...form.getInputProps('allowedTypes')}
            />
            <DateTimePicker
              clearable
              minDate={now}
              label={t('form.expiresAt')}
              description={t('form.expiresAtHelp')}
              {...form.getInputProps('expiresAt')}
            />
            <PasswordInput
              label={t('form.password')}
              description={editing ? t('form.passwordEditHelp') : t('form.passwordHelp')}
              disabled={form.values.removePassword}
              {...form.getInputProps('password')}
            />
            {editing?.passwordProtected && (
              <Switch
                label={t('form.removePassword')}
                {...form.getInputProps('removePassword', { type: 'checkbox' })}
              />
            )}
            <Switch label={t('form.enabled')} {...form.getInputProps('enabled', { type: 'checkbox' })} />
            <Group justify='flex-end'>
              <Button variant='default' onClick={() => setModalOpen(false)}>
                {t('common:actions.cancel')}
              </Button>
              <Button type='submit' loading={form.submitting}>
                {t(editing ? 'form.save' : 'form.create')}
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      <Group justify='space-between' align='flex-start' mb='md'>
        <div>
          <Title order={1}>{t('title')}</Title>
          <Text c='dimmed'>{t('description')}</Text>
        </div>
        <Button leftSection={<IconPlus size='1rem' />} onClick={openCreate}>
          {t('create')}
        </Button>
      </Group>

      {error ? (
        <Alert color='red' title={t('loadError')}>
          {error.message}
        </Alert>
      ) : isLoading ? (
        <SimpleGrid cols={{ base: 1, lg: 2 }}>
          <Skeleton h={180} />
          <Skeleton h={180} />
        </SimpleGrid>
      ) : data?.length ? (
        <SimpleGrid cols={{ base: 1, lg: 2 }}>
          {data.map((request) => {
            const expired = !!request.expiresAt && new Date(request.expiresAt) <= now;
            const full =
              (request.maxFiles !== null && request.receivedFiles >= request.maxFiles) ||
              (request.maxBytes !== null && request.receivedBytes >= request.maxBytes);
            const open = request.enabled && !expired && !full;
            const url = `${window.location.origin}/request/${request.id}`;
            return (
              <Paper withBorder p='md' key={request.id}>
                <Group justify='space-between' align='flex-start' wrap='nowrap'>
                  <div style={{ minWidth: 0 }}>
                    <Group gap='xs'>
                      <Text fw={700} truncate>
                        {request.name}
                      </Text>
                      <Badge color={open ? 'green' : 'gray'} variant='light'>
                        {t(
                          open
                            ? 'status.open'
                            : expired
                              ? 'status.expired'
                              : full
                                ? 'status.full'
                                : 'status.closed',
                        )}
                      </Badge>
                    </Group>
                    {request.description && (
                      <Text c='dimmed' size='sm' lineClamp={2} mt={4}>
                        {request.description}
                      </Text>
                    )}
                  </div>
                  <Group gap={4} wrap='nowrap'>
                    <CopyButton value={url}>
                      {({ copied, copy }) => (
                        <Tooltip label={t(copied ? 'copied' : 'copy')}>
                          <ActionIcon variant='subtle' onClick={copy} aria-label={t('copy')}>
                            {copied ? <IconCheck size='1rem' /> : <IconClipboardCopy size='1rem' />}
                          </ActionIcon>
                        </Tooltip>
                      )}
                    </CopyButton>
                    <Tooltip label={t('edit')}>
                      <ActionIcon variant='subtle' onClick={() => openEdit(request)} aria-label={t('edit')}>
                        <IconEdit size='1rem' />
                      </ActionIcon>
                    </Tooltip>
                    <Tooltip label={t('delete.button')}>
                      <ActionIcon
                        color='red'
                        variant='subtle'
                        onClick={() => remove(request)}
                        aria-label={t('delete.button')}
                      >
                        <IconTrash size='1rem' />
                      </ActionIcon>
                    </Tooltip>
                  </Group>
                </Group>

                <SimpleGrid cols={2} mt='md' spacing='xs'>
                  <div>
                    <Text c='dimmed' size='xs'>
                      {t('receivedFiles')}
                    </Text>
                    <Text fw={600}>
                      {request.receivedFiles}
                      {request.maxFiles ? ` / ${request.maxFiles}` : ''}
                    </Text>
                  </div>
                  <div>
                    <Text c='dimmed' size='xs'>
                      {t('receivedSize')}
                    </Text>
                    <Text fw={600}>
                      {bytes(request.receivedBytes)}
                      {request.maxBytes ? ` / ${bytes(request.maxBytes)}` : ''}
                    </Text>
                  </div>
                  <div>
                    <Text c='dimmed' size='xs'>
                      {t('destination')}
                    </Text>
                    <Text size='sm'>{request.folderName ?? t('form.rootFolder')}</Text>
                  </div>
                  <div>
                    <Text c='dimmed' size='xs'>
                      {t('protection')}
                    </Text>
                    <Text size='sm'>
                      {request.passwordProtected ? t('passwordProtected') : t('linkOnly')}
                    </Text>
                  </div>
                </SimpleGrid>
              </Paper>
            );
          })}
        </SimpleGrid>
      ) : (
        <Stack align='center' py={60} gap='xs'>
          <IconFileArrowRight size='2.5rem' stroke={1.5} />
          <Text fw={700}>{t('empty.title')}</Text>
          <Text c='dimmed' ta='center' maw={460}>
            {t('empty.description')}
          </Text>
          <Button mt='sm' leftSection={<IconPlus size='1rem' />} onClick={openCreate}>
            {t('create')}
          </Button>
        </Stack>
      )}
    </>
  );
}
