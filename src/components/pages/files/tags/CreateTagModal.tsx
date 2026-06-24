import { Response } from '@/lib/api/response';
import { Tag } from '@/lib/db/models/tag';
import { fetchApi } from '@/lib/fetchApi';
import { colorHash } from '@/lib/theme/color';
import { ActionIcon, Button, ColorInput, Modal, Stack, TextInput, Tooltip } from '@mantine/core';
import { useForm } from '@mantine/form';
import { showNotification } from '@mantine/notifications';
import { IconTag, IconTagOff, IconTextRecognition } from '@tabler/icons-react';
import { mutate } from 'swr';

export default function CreateTagModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const form = useForm<{
    name: string;
    color: string;
  }>({
    initialValues: {
      name: '',
      color: '',
    },
    validate: {
      name: (value) => (value.length < 1 ? 'Name is required' : null),
    },
  });

  const onSubmit = async (values: typeof form.values) => {
    const color = values.color.trim() === '' ? colorHash(values.name) : values.color.trim();

    if (!color.startsWith('#')) {
      return form.setFieldError('color', 'Color must start with #');
    }

    const { data, error } = await fetchApi<Extract<Response['/api/user/tags'], Tag>>(
      '/api/user/tags',
      'POST',
      {
        name: values.name,
        color,
      },
    );

    if (error) {
      showNotification({
        title: 'Failed to create tag',
        message: error.error,
        color: 'red',
        icon: <IconTagOff size='1rem' />,
      });
    } else {
      showNotification({
        title: 'Created tag',
        message: `Created tag ${data!.name}`,
        color: data!.color,
        icon: <IconTag size='1rem' />,
      });

      onClose();
      form.reset();
      mutate('/api/user/tags');
    }
  };

  return (
    <Modal opened={open} onClose={onClose} title='Create new tag' zIndex={3000}>
      <form onSubmit={form.onSubmit(onSubmit)}>
        <Stack gap='sm'>
          <TextInput label='Name' placeholder='Enter a name...' {...form.getInputProps('name')} />

          <ColorInput
            label='Color'
            rightSection={
              <Tooltip label='Choose a color based on the name' zIndex={3001}>
                <ActionIcon
                  variant='transparent'
                  color='white'
                  onClick={() => form.setFieldValue('color', colorHash(form.values.name))}
                >
                  <IconTextRecognition size='1rem' />
                </ActionIcon>
              </Tooltip>
            }
            popoverProps={{ zIndex: 3001 }}
            {...form.getInputProps('color')}
          />

          <Button type='submit' variant='outline'>
            Create tag
          </Button>
        </Stack>
      </form>
    </Modal>
  );
}
