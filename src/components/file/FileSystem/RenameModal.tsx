import { File } from '@/lib/db/models/file';
import { Folder } from '@/lib/db/models/folder';
import { useForm } from '@mantine/form';
import React, { useCallback, useEffect } from 'react';
import { editFolderName } from '@/components/pages/folders/actions';
import { Button, Modal, Stack, TextInput } from '@mantine/core';
import { IconEdit } from '@tabler/icons-react';
import { renameFile } from '@/components/file/actions';

const RenameModal = ({
  opened,
  onClose,
  item,
  type,
}: {
  opened: boolean;
  onClose: () => void;
  item: File | Folder | null | undefined;
  type: 'file' | 'folder' | undefined;
}) => {
  const form = useForm({
    initialValues: {
      name: '',
    },
    validate: {
      name: (value) => (value.length < 1 ? 'Name is required' : null),
    },
  });

  const handleRename = useCallback(
    async (values: typeof form.values) => {
      if (!item) return;

      if (type === 'folder') {
        await editFolderName(item as Folder, values.name);
      } else {
        await renameFile(item as File, values.name);
      }
      onClose();
      form.reset();
    },
    [item, type, onClose, form],
  );

  useEffect(() => {
    form.setValues({
      name: type === 'folder' ? (item as Folder)?.name || '' : (item as File)?.originalName || '',
    });
  }, [opened]);

  return (
    <Modal
      centered
      opened={opened}
      onClose={() => {
        form.reset();
        onClose();
      }}
      title={`Rename ${type}`}
    >
      <form onSubmit={form.onSubmit(handleRename)}>
        <Stack gap='sm'>
          <TextInput label='Name' placeholder={`Enter ${type} name...`} {...form.getInputProps('name')} />
          <Button type='submit' variant='outline' radius='sm' leftSection={<IconEdit size='1rem' />}>
            Rename
          </Button>
        </Stack>
      </form>
    </Modal>
  );
};

export default RenameModal;
