import { Button, Group, Modal, TextInput, Title } from '@mantine/core';
import { useForm } from '@mantine/form';
import { showNotification } from '@mantine/notifications';
import { IconFolderPlus, IconFolderX } from '@tabler/icons-react';
import MutedText from 'components/MutedText';
import useFetch from 'hooks/useFetch';
import { useRouter } from 'next/router';

export default function CreateFolderModal({ open, setOpen, updateFolders, createWithFile }) {
  const router = useRouter();

  const form = useForm({
    initialValues: {
      name: '',
    },
  });

  const onSubmit = async (values) => {
    const res = await useFetch('/api/user/folders', 'POST', {
      name: values.name,
      add: createWithFile ? [createWithFile] : undefined,
    });

    if (res.error) {
      showNotification({
        title: 'Failed to create folder',
        message: res.error,
        icon: <IconFolderX size='1rem' />,
        color: 'red',
      });
    } else {
      showNotification({
        title: 'Created folder ' + res.name,
        message: createWithFile ? 'Added file to folder' : undefined,
        icon: <IconFolderPlus size='1rem' />,
        color: 'green',
      });

      if (createWithFile) {
        router.push('/dashboard/folders');
      }
    }

    setOpen(false);
    updateFolders();
    form.setValues({ name: '' });
  };

  return (
    <Modal opened={open} onClose={() => setOpen(false)} title={<Title>Create Folder</Title>}>
      <form onSubmit={form.onSubmit((v) => onSubmit(v))}>
        <TextInput label='Folder Name' placeholder='Folder Name' {...form.getInputProps('name')} />

        {createWithFile && (
          <MutedText size='sm'>
            Creating this folder will add file with an ID of <b>{createWithFile}</b> to it automatically.
          </MutedText>
        )}

        <Group position='right' mt='md'>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button type='submit'>Create</Button>
        </Group>
      </form>
    </Modal>
  );
}
