import { Response } from '@/lib/api/response';
import { readToDataURL } from '@/lib/base64';
import { fetchApi } from '@/lib/fetchApi';
import useAvatar from '@/lib/hooks/useAvatar';
import { useUserStore } from '@/lib/store/user';
import {
  Avatar,
  Button,
  Card,
  FileInput,
  Group,
  Paper,
  Stack,
  Text,
  Title,
  useMantineColorScheme,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconChevronDown,
  IconPhoto,
  IconPhotoCancel,
  IconPhotoUp,
  IconSettingsFilled,
} from '@tabler/icons-react';
import { useEffect, useState } from 'react';

export default function SettingsAvatar() {
  const user = useUserStore((state) => state.user);

  const { colorScheme } = useMantineColorScheme();

  const { avatar: currentAvatar, mutate } = useAvatar();
  const [avatar, setAvatar] = useState<File | null>(null);
  const [avatarSrc, setAvatarSrc] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (!avatar) return;

      const base64url = await readToDataURL(avatar);
      setAvatarSrc(base64url);
    })();
  }, [avatar]);

  const saveAvatar = async () => {
    if (!avatar) return;

    const base64url = await readToDataURL(avatar);
    const { data, error } = await fetchApi<Response['/api/user']>('/api/user', 'PATCH', {
      avatar: base64url,
    });

    if (!data && error) {
      notifications.show({
        title: 'Error while updating avatar',
        message: error.message,
        color: 'red',
        icon: <IconPhotoCancel size='1rem' />,
      });

      return;
    }

    notifications.show({
      message: 'Avatar updated',
      color: 'green',
      icon: <IconPhoto size='1rem' />,
    });

    setAvatar(null);
    setAvatarSrc(null);
    mutate(base64url);
  };

  const clearAvatar = async () => {
    const { data, error } = await fetchApi<Response['/api/user']>('/api/user', 'PATCH', {
      avatar: null,
    });

    if (!data && error) {
      notifications.show({
        title: 'Error while updating avatar',
        message: error.message,
        color: 'red',
        icon: <IconPhotoCancel size='1rem' />,
      });

      return;
    }

    notifications.show({
      message: 'Avatar updated',
      color: 'green',
      icon: <IconPhoto size='1rem' />,
    });

    setAvatar(null);
    setAvatarSrc(null);
    mutate(undefined);
  };

  return (
    <Paper withBorder p='sm'>
      <Title order={2}>Avatar</Title>

      <Stack gap='sm'>
        <FileInput
          accept='image/*'
          placeholder='Upload new avatar...'
          value={avatar}
          onChange={(file) => setAvatar(file)}
          leftSection={<IconPhotoUp size='1rem' />}
        />

        <Card withBorder shadow='sm'>
          <Text size='sm' c='dimmed'>
            Preview of {avatar ? 'new' : 'current'} avatar
          </Text>

          <Button
            justify='left'
            variant='transparent'
            color={colorScheme === 'dark' ? 'white' : 'black'}
            leftSection={
              avatarSrc ? (
                <Avatar src={avatarSrc} radius='sm' size='sm' alt={user?.username ?? 'Proposed avatar'} />
              ) : currentAvatar ? (
                <Avatar src={currentAvatar} radius='sm' size='sm' alt={user?.username ?? 'User avatar'} />
              ) : (
                <IconSettingsFilled size='1rem' />
              )
            }
            rightSection={<IconChevronDown size='0.7rem' />}
            size='sm'
          >
            {user?.username}
          </Button>
        </Card>

        <Group justify='left'>
          {avatarSrc && (
            <Button
              variant='outline'
              color='red'
              onClick={() => {
                setAvatar(null);
                setAvatarSrc(null);
              }}
            >
              Cancel
            </Button>
          )}
          {currentAvatar && (
            <Button variant='outline' color='red' onClick={clearAvatar}>
              Remove Avatar
            </Button>
          )}
          <Button variant='outline' disabled={!avatar} onClick={saveAvatar}>
            Save
          </Button>
        </Group>
      </Stack>
    </Paper>
  );
}
