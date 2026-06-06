import { File } from '@/lib/db/models/file';
import { fetchApi } from '@/lib/fetchApi';
import useObjectState from '@/lib/client/hooks/useObjectState';
import { Button, Divider, Modal, NumberInput, PasswordInput, Stack, Switch, TextInput } from '@mantine/core';
import { showNotification } from '@mantine/notifications';
import { IconEye, IconKey, IconPencil, IconPencilOff, IconTrashFilled } from '@tabler/icons-react';
import { useEffect } from 'react';
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
  const [formData, setFormData] = useObjectState<{
    name: string;
    maxViews: number | null;
    password: string | null;
    originalName: string | null;
    type: string | null;
    public: boolean;
  }>({
    name: file?.name ?? '',
    maxViews: file?.maxViews ?? null,
    password: file?.password ? '' : null,
    originalName: file?.originalName ?? null,
    type: file?.type ?? null,
    public: file?.public ?? false,
  });

  useEffect(() => {
    if (open) {
      setFormData({
        name: file?.name ?? '',
        maxViews: file?.maxViews ?? null,
        password: file?.password ? '' : null,
        originalName: file?.originalName ?? null,
        type: file?.type ?? null,
        public: file?.public ?? false,
      });
    } else {
      setFormData({
        name: '',
        maxViews: null,
        password: null,
        originalName: null,
        type: null,
        public: false,
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
        title: 'Failed to remove password...',
        message: error.error,
        color: 'red',
        icon: <IconPencilOff size='1rem' />,
      });
    } else {
      showNotification({
        title: 'Password removed!',
        message: 'The password has been removed from the file.',
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
      public?: boolean;
    } = {};

    if (formData.maxViews !== null) data['maxViews'] = formData.maxViews;
    if (formData.originalName !== null) data['originalName'] = formData.originalName?.trim();
    if (formData.type !== null) data['type'] = formData.type?.trim();
    if (formData.name !== file.name) data['name'] = formData.name.trim();
    if (formData.public !== file.public) data['public'] = formData.public;

    const passwordTrimmed = formData.password?.trim();
    if (passwordTrimmed !== '') data['password'] = passwordTrimmed;

    const { error } = await fetchApi(`/api/user/files/${file.id}`, 'PATCH', data);

    if (error) {
      showNotification({
        title: 'Failed to save changes...',
        message: error.error,
        color: 'red',
        icon: <IconPencilOff size='1rem' />,
      });
    } else {
      showNotification({
        title: 'Changes saved!',
        message: 'The changes to the file have been saved.',
        color: 'green',
        icon: <IconPencil size='1rem' />,
      });

      onClose();

      setFormData('password', null);
      mutateFiles();
    }
  };

  return (
    <Modal zIndex={400} title={`Editing "${file.name}"`} onClose={onClose} opened={open}>
      <Stack gap='xs' my='sm'>
        <TextInput
          label='Name'
          description='Rename the file.'
          value={formData.name}
          onChange={(event) => setFormData('name', event.currentTarget.value.trim())}
        />

        <NumberInput
          label='Max Views'
          placeholder='Unlimited'
          description='The maximum number of views this file can have before it is deleted. Leave blank to allow as many views as you want.'
          min={0}
          value={formData.maxViews || ''}
          onChange={(value) => setFormData('maxViews', value === '' ? null : Number(value))}
          leftSection={<IconEye size='1rem' />}
        />

        <TextInput
          label='Original Name'
          description='Add an original name. When downloading this file, instead of using the generated file name (if chosen), it will download with this "original name" instead.'
          value={formData.originalName ?? ''}
          onChange={(event) =>
            setFormData(
              'originalName',
              event.currentTarget.value.trim() === '' ? null : event.currentTarget.value.trim(),
            )
          }
        />

        <TextInput
          label='Type'
          description={
            <>
              Change a file&apos;s mimetype. <b>DO NOT CHANGE THIS VALUE</b> unless you know what you are
              doing, this can mess with how Zipline renders specific file types.
            </>
          }
          value={formData.type ?? ''}
          onChange={(event) =>
            setFormData(
              'type',
              event.currentTarget.value.trim() === '' ? null : event.currentTarget.value.trim(),
            )
          }
          c='red'
        />

        <Switch
          label='Public File'
          description='Show this file on your public profile gallery.'
          checked={formData.public || false}
          onChange={(event) => setFormData('public', event.currentTarget.checked)}
        />

        <Divider />

        {file.password ? (
          <Button
            variant='light'
            color='red'
            leftSection={<IconTrashFilled size='1rem' />}
            onClick={handleRemovePassword}
          >
            Remove Password
          </Button>
        ) : (
          <PasswordInput
            label='Password'
            description='Set a password for this file. Leave blank to disable password protection.'
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
          Save changes
        </Button>
      </Stack>
    </Modal>
  );
}
