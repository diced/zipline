import { Response } from '@/lib/api/response';
import { readToDataURL } from '@/lib/base64';
import { fetchApi } from '@/lib/fetchApi';
import useAvatar from '@/lib/client/hooks/useAvatar';
import { useUserStore } from '@/lib/client/store/user';
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
  IconDeviceFloppy,
  IconPhoto,
  IconPhotoCancel,
  IconPhotoUp,
  IconSettingsFilled,
  IconX,
} from '@tabler/icons-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

export default function SettingsAvatar() {
  const { t } = useTranslation(['settings', 'common']);
  const user = useUserStore((state) => state.user);

  const { colorScheme } = useMantineColorScheme();

  const { avatar: currentAvatar, mutate } = useAvatar();
  const [avatar, setAvatar] = useState<File | null>(null);
  const [avatarSrc, setAvatarSrc] = useState<string | null>(null);

  const onAvatarChange = async (file: File | null) => {
    setAvatar(file);

    if (!file) {
      setAvatarSrc(null);
      return;
    }

    setAvatarSrc(await readToDataURL(file));
  };

  const saveAvatar = async () => {
    if (!avatar) return;

    const base64url = await readToDataURL(avatar);
    const { data, error } = await fetchApi<Response['/api/user']>('/api/user', 'PATCH', {
      avatar: base64url,
    });

    if (!data && error) {
      notifications.show({
        title: t('avatar.notifications.error.title'),
        message: error.error,
        color: 'red',
        icon: <IconPhotoCancel size='1rem' />,
      });

      return;
    }

    notifications.show({
      message: t('avatar.notifications.updated.message'),
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
        title: t('avatar.notifications.error.title'),
        message: error.error,
        color: 'red',
        icon: <IconPhotoCancel size='1rem' />,
      });

      return;
    }

    notifications.show({
      message: t('avatar.notifications.updated.message'),
      color: 'green',
      icon: <IconPhoto size='1rem' />,
    });

    setAvatar(null);
    setAvatarSrc(null);
    mutate(undefined);
  };

  return (
    <Paper withBorder p='sm'>
      <Title order={2}>{t('avatar.title')}</Title>

      <Stack gap='sm'>
        <FileInput
          accept='image/*'
          placeholder={t('avatar.placeholder')}
          value={avatar}
          onChange={onAvatarChange}
          leftSection={<IconPhotoUp size='1rem' />}
        />

        <Card withBorder shadow='sm'>
          <Text size='sm' c='dimmed'>
            {avatar ? t('avatar.previewNew') : t('avatar.previewCurrent')}
          </Text>

          <Button
            justify='left'
            variant='transparent'
            color={colorScheme === 'dark' ? 'white' : 'black'}
            leftSection={
              avatarSrc ? (
                <Avatar
                  src={avatarSrc}
                  radius='sm'
                  size='sm'
                  alt={user?.username ?? t('avatar.proposedAlt')}
                />
              ) : currentAvatar ? (
                <Avatar
                  src={currentAvatar}
                  radius='sm'
                  size='sm'
                  alt={user?.username ?? t('avatar.currentAlt')}
                />
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
              {t('common:actions.cancel')}
            </Button>
          )}
          {currentAvatar && (
            <Button leftSection={<IconX size='1rem' />} color='red' onClick={clearAvatar}>
              {t('avatar.remove')}
            </Button>
          )}

          <Button
            type='submit'
            disabled={!avatar}
            leftSection={<IconDeviceFloppy size='1rem' />}
            onClick={saveAvatar}
          >
            {t('common:actions.save')}
          </Button>
        </Group>
      </Stack>
    </Paper>
  );
}
