import { File } from '@/lib/db/models/file';
import { fetchApi } from '@/lib/fetchApi';
import { Button, Divider, Modal, NumberInput, PasswordInput, Stack, TextInput, Title } from '@mantine/core';
import { showNotification } from '@mantine/notifications';
import { IconEye, IconKey, IconPencil, IconPencilOff, IconTrashFilled } from '@tabler/icons-react';
import { useState } from 'react';
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
  if (!file) return null;

  const [maxViews, setMaxViews] = useState<number | null>(file?.maxViews ?? null);
  const [password, setPassword] = useState<string | null>('');
  const [originalName, setOriginalName] = useState<string | null>(file?.originalName ?? null);
  const [type, setType] = useState<string | null>(file?.type ?? null);

  const handleRemovePassword = async () => {
    if (!file.password) return;

    const { error } = await fetchApi(`/api/user/files/${file.id}`, 'PATCH', {
      password: null,
    });

    if (error) {
      showNotification({
        title: 'Failed to remove password...',
        message: error.message,
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
    } = {};

    if (maxViews !== null) data['maxViews'] = maxViews;
    if (password !== null) data['password'] = password?.trim();
    if (originalName !== null) data['originalName'] = originalName?.trim();
    if (type !== null) data['type'] = type?.trim();

    const { error } = await fetchApi(`/api/user/files/${file.id}`, 'PATCH', data);

    if (error) {
      showNotification({
        title: 'Failed to save changes...',
        message: error.message,
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

      setPassword(null);
      mutateFiles();
    }
  };

  return (
    <Modal
      zIndex={300}
      title={<Title>Editing &quot;{file.name}&quot;</Title>}
      onClose={onClose}
      opened={open}
    >
      <Stack gap='xs' my='sm'>
        <NumberInput
          label='Max Views'
          placeholder='Unlimited'
          description='The maximum number of views the files can have before they are deleted. Leave blank to allow as many views as you want.'
          min={0}
          value={maxViews || ''}
          onChange={(value) => setMaxViews(value === '' ? null : Number(value))}
          leftSection={<IconEye size='1rem' />}
        />

        <TextInput
          label='Original Name'
          description='Add an original name. When downloading this file instead of using the generated file name (if chosen), it will download with this "original name" instead.'
          value={originalName ?? ''}
          onChange={(event) =>
            setOriginalName(event.currentTarget.value.trim() === '' ? null : event.currentTarget.value.trim())
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
          value={type ?? ''}
          onChange={(event) =>
            setType(event.currentTarget.value.trim() === '' ? null : event.currentTarget.value.trim())
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
            Remove Password
          </Button>
        ) : (
          <PasswordInput
            label='Password'
            description='Set a password for these files. Leave blank to disable password protection.'
            value={password ?? ''}
            onChange={(event) =>
              setPassword(event.currentTarget.value.trim() === '' ? null : event.currentTarget.value.trim())
            }
            leftSection={<IconKey size='1rem' />}
          />
        )}

        <Divider />

        <Button onClick={handleSave} leftSection={<IconPencil size='1rem' />}>
          Save Changes
        </Button>
      </Stack>
    </Modal>
  );
}
