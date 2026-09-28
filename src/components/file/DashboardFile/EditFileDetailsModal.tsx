import { File } from '@/lib/db/models/file';
import { fetchApi } from '@/lib/fetchApi';
import useObjectState from '@/lib/client/hooks/useObjectState';
import { Button, Divider, Modal, NumberInput, PasswordInput, Stack, TextInput } from '@mantine/core';
import { showNotification } from '@mantine/notifications';
import { IconEye, IconKey, IconPencil, IconPencilOff, IconTrashFilled } from '@tabler/icons-react';
import { useEffect } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { mutateFiles } from '../actions';

export default function EditFileDetailsModal({
  file,
  onClose,
  open,
}: {
  open: boolean;
  file: File | null;
  onClose: () => void;
}) {
  const { t } = useTranslation('file');
  const [formData, setFormData] = useObjectState<{
    name: string;
    maxViews: number | null;
    password: string | null;
    originalName: string | null;
    type: string | null;
  }>({
    name: file?.name ?? '',
    maxViews: file?.maxViews ?? null,
    password: file?.password ? '' : null,
    originalName: file?.originalName ?? null,
    type: file?.type ?? null,
  });

  useEffect(() => {
    if (open) {
      setFormData({
        name: file?.name ?? '',
        maxViews: file?.maxViews ?? null,
        password: file?.password ? '' : null,
        originalName: file?.originalName ?? null,
        type: file?.type ?? null,
      });
    } else {
      setFormData({
        name: '',
        maxViews: null,
        password: null,
        originalName: null,
        type: null,
      });
    }
  }, [open, file]);

  if (!file) return null;

  const handleRemovePassword = async () => {
    if (!file.password) return;

    const { error } = await fetchApi(`/api/user/files/${file.id}`, 'PATCH', {
      password: null,
    });

    if (error) {
      showNotification({
        title: t('notifications.removePasswordError.title'),
        message: error.error,
        color: 'red',
        icon: <IconPencilOff size='1rem' />,
      });
    } else {
      showNotification({
        title: t('notifications.passwordRemoved.title'),
        message: t('notifications.passwordRemoved.message'),
        color: 'green',
        icon: <IconPencil size='1rem' />,
      });

      mutateFiles();
    }
  };

  const handleSave = async () => {
    const data: {
      maxViews?: number;
      password?: string;
      originalName?: string;
      type?: string;
      name?: string;
    } = {};

    if (formData.maxViews !== null) data['maxViews'] = formData.maxViews;
    if (formData.originalName !== null) data['originalName'] = formData.originalName?.trim();
    if (formData.type !== null) data['type'] = formData.type?.trim();
    if (formData.name !== file.name) data['name'] = formData.name.trim();

    const passwordTrimmed = formData.password?.trim();
    if (passwordTrimmed !== '') data['password'] = passwordTrimmed;

    const { error } = await fetchApi(`/api/user/files/${file.id}`, 'PATCH', data);

    if (error) {
      showNotification({
        title: t('notifications.saveChangesError.title'),
        message: error.error,
        color: 'red',
        icon: <IconPencilOff size='1rem' />,
      });
    } else {
      showNotification({
        title: t('notifications.changesSaved.title'),
        message: t('notifications.changesSaved.message'),
        color: 'green',
        icon: <IconPencil size='1rem' />,
      });

      onClose();

      setFormData('password', null);
      mutateFiles();
    }
  };

  return (
    <Modal zIndex={400} title={t('edit.title', { name: file.name })} onClose={onClose} opened={open}>
      <Stack gap='xs' my='sm'>
        <TextInput
          label={t('edit.name.label')}
          description={t('edit.name.description')}
          value={formData.name}
          onChange={(event) => setFormData('name', event.currentTarget.value.trim())}
        />

        <NumberInput
          label={t('edit.maxViews.label')}
          placeholder={t('edit.maxViews.placeholder')}
          description={t('edit.maxViews.description')}
          min={0}
          value={formData.maxViews || ''}
          onChange={(value) => setFormData('maxViews', value === '' ? null : Number(value))}
          leftSection={<IconEye size='1rem' />}
        />

        <TextInput
          label={t('edit.originalName.label')}
          description={t('edit.originalName.description')}
          value={formData.originalName ?? ''}
          onChange={(event) =>
            setFormData(
              'originalName',
              event.currentTarget.value.trim() === '' ? null : event.currentTarget.value.trim(),
            )
          }
        />

        <TextInput
          label={t('edit.type.label')}
          description={<Trans t={t} i18nKey='edit.type.description' components={{ b: <b /> }} />}
          value={formData.type ?? ''}
          onChange={(event) =>
            setFormData(
              'type',
              event.currentTarget.value.trim() === '' ? null : event.currentTarget.value.trim(),
            )
          }
          c='red'
        />

        <Divider />

        {file.password ? (
          <Button
            variant='light'
            color='red'
            leftSection={<IconTrashFilled size='1rem' />}
            onClick={handleRemovePassword}
          >
            {t('edit.removePassword')}
          </Button>
        ) : (
          <PasswordInput
            label={t('edit.password.label')}
            description={t('edit.password.description')}
            value={formData.password ?? ''}
            autoComplete='off'
            onChange={(event) =>
              setFormData(
                'password',
                event.currentTarget.value.trim() === '' ? null : event.currentTarget.value.trim(),
              )
            }
            leftSection={<IconKey size='1rem' />}
          />
        )}

        <Divider />

        <Button onClick={handleSave} leftSection={<IconPencil size='1rem' />}>
          {t('edit.save')}
        </Button>
      </Stack>
    </Modal>
  );
}
