import { Response } from '@/lib/api/response';
import type { Folder } from '@/lib/db/models/folder';
import { fetchApi } from '@/lib/fetchApi';
import { Button, Modal, Stack, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { showNotification } from '@mantine/notifications';
import { IconPencil } from '@tabler/icons-react';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { mutateFolder } from '../actions';

export default function EditFolderNameModal({
  folder,
  onClose,
  opened,
}: {
  folder: Folder | null;
  onClose: () => void;
  opened: boolean;
}) {
  const { t } = useTranslation(['folders', 'common']);
  const form = useForm({
    initialValues: {
      name: '',
    },
    validate: {
      name: (value) => (value.trim() === '' ? t('edit.required') : null),
    },
  });

  const onSubmit = async (values: typeof form.values) => {
    if (!folder) return;

    const { data, error } = await fetchApi<Response['/api/user/folders/[id]']>(
      `/api/user/folders/${folder?.id}`,
      'PATCH',
      {
        name: values.name.trim(),
      },
    );

    if (error) {
      showNotification({
        title: t('edit.notifications.failed'),
        message: error.error,
      });
    } else {
      mutateFolder();
      showNotification({
        title: t('edit.notifications.updated'),
        message: t('edit.notifications.updatedMessage', { name: data?.name }),
      });
      onClose();
    }
  };

  useEffect(() => {
    if (folder && opened) {
      form.setFieldValue('name', folder.name);
    }
  }, [folder, opened]);

  return (
    <Modal opened={opened} onClose={onClose} title={t('edit.title')}>
      <form onSubmit={form.onSubmit(onSubmit)}>
        <Stack>
          <TextInput
            placeholder={t('edit.placeholder')}
            label={t('edit.label')}
            {...form.getInputProps('name')}
          />

          <Button type='submit' color='blue' fullWidth leftSection={<IconPencil size='1rem' />}>
            {t('common:actions.save')}
          </Button>
        </Stack>
      </form>
    </Modal>
  );
}
