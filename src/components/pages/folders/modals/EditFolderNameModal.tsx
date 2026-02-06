import { mutateFolders } from '@/components/file/actions';
import { Response } from '@/lib/api/response';
import type { Folder } from '@/lib/db/models/folder';
import { fetchApi } from '@/lib/fetchApi';
import { Button, Modal, Stack, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { showNotification } from '@mantine/notifications';
import { IconPencil } from '@tabler/icons-react';
import { useEffect } from 'react';

export default function EditFolderNameModal({
  folder,
  onClose,
  opened,
}: {
  folder: Folder | null;
  onClose: () => void;
  opened: boolean;
}) {
  const form = useForm({
    initialValues: {
      name: '',
    },
    validate: {
      name: (value) => (value.trim() === '' ? 'Name is required' : null),
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
        title: 'Error while updating folder name',
        message: error.error,
      });
    } else {
      mutateFolders();
      showNotification({
        title: 'Folder name updated',
        message: 'Folder name has been updated successfully to ' + data?.name,
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
    <Modal opened={opened} onClose={onClose} title='Edit folder name'>
      <form onSubmit={form.onSubmit(onSubmit)}>
        <Stack>
          <TextInput
            placeholder='Enter new folder name...'
            label='New folder name'
            {...form.getInputProps('name')}
          />

          <Button type='submit' color='blue' fullWidth leftSection={<IconPencil size='1rem' />}>
            Save
          </Button>
        </Stack>
      </form>
    </Modal>
  );
}
