import { Response } from '@/lib/api/response';
import { readToDataURL } from '@/lib/base64';
import { fetchApi } from '@/lib/fetchApi';
import useAvatar from '@/lib/hooks/useAvatar';
import { useUserStore } from '@/lib/store/user';
import { useSettingsStore } from '@/lib/store/settings';
import { useThemes } from '@/components/ThemeProvider';
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
  Divider,
  Select,
  TextInput,
  Radio,
  Box,
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
  IconPaintFilled,
  IconMoonFilled,
  IconSunFilled,
  IconWorldWww,
  IconColorSwatch,
} from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { useShallow } from 'zustand/shallow';

const renderThemeOption =
  (themes: ReturnType<typeof useThemes>) =>
  ({ option }: { option: { value: string; label: string } }) => (
    <Group gap='xs'>
      {option.value === 'system' ? (
        <IconPaintFilled size='1rem' />
      ) : themes.find((theme) => theme.id === option.value)?.colorScheme === 'dark' ? (
        <IconMoonFilled size='1rem' />
      ) : (
        <IconSunFilled size='1rem' />
      )}
      {option.label}
    </Group>
  );

export default function SettingsAvatar() {
  const user = useUserStore((state) => state.user);
  const [settings, updateSettings] = useSettingsStore(useShallow((state) => [state.settings, state.update]));
  const themes = useThemes();

  const { colorScheme } = useMantineColorScheme();

  const { avatar: currentAvatar, mutate } = useAvatar();
  const [avatar, setAvatar] = useState<File | null>(null);
  const [avatarSrc, setAvatarSrc] = useState<string | null>(null);

  const sortedThemes = themes.sort((a, b) => {
    if (a.colorScheme === 'light' && b.colorScheme === 'dark') return -1;
    if (a.colorScheme === 'dark' && b.colorScheme === 'light') return 1;
    return 0;
  });

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
        message: error.error,
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
        message: error.error,
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
      <Title order={2}>Avatar & Theme</Title>

      <Stack gap='lg'>
        {/* Avatar Section */}
        <Stack gap='sm'>
          <Text size='sm' fw={500}>Avatar</Text>
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
              <Button leftSection={<IconX size='1rem' />} color='red' onClick={clearAvatar}>
                Remove Avatar
              </Button>
            )}

            <Button
              type='submit'
              disabled={!avatar}
              leftSection={<IconDeviceFloppy size='1rem' />}
              onClick={saveAvatar}
            >
              Save Avatar
            </Button>
          </Group>
        </Stack>

        <Divider />

        {/* Theme Section */}
        <Stack gap='sm'>
          <Text size='sm' fw={500}>Theme Settings</Text>
          <Text size='xs' c='dimmed'>
            These settings are saved in your browser and apply only to your view.
          </Text>

          <Select
            label='Theme'
            description='The theme to use for the dashboard.'
            data={[
              { value: 'system', label: 'System' },
              ...sortedThemes.map((theme) => ({ value: theme.id, label: theme.name })),
            ]}
            value={settings.theme}
            onChange={(value) => updateSettings('theme', value ?? 'builtin:dark_blue')}
            leftSection={<IconPaintFilled size='1rem' />}
            renderOption={renderThemeOption(themes)}
          />

          {settings.theme === 'system' && (
            <Group grow>
              <Select
                label='Dark Theme'
                description='Theme for dark mode'
                data={themes
                  .filter((theme) => theme.colorScheme === 'dark')
                  .map((theme) => ({ value: theme.id, label: theme.name }))}
                value={settings.themeDark}
                onChange={(value) => updateSettings('themeDark', value ?? 'builtin:dark_gray')}
                leftSection={<IconMoonFilled size='1rem' />}
              />

              <Select
                label='Light Theme'
                description='Theme for light mode'
                data={themes
                  .filter((theme) => theme.colorScheme === 'light')
                  .map((theme) => ({ value: theme.id, label: theme.name }))}
                value={settings.themeLight}
                onChange={(value) => updateSettings('themeLight', value ?? 'builtin:light_gray')}
                leftSection={<IconSunFilled size='1rem' />}
              />
            </Group>
          )}
        </Stack>

        <Divider />

        {/* Background Section */}
        <Stack gap='sm'>
          <Text size='sm' fw={500}>Background Settings</Text>
          <Text size='xs' c='dimmed'>
            Customize your dashboard background with blur effects.
          </Text>

          <Radio.Group
            value={settings.backgroundType}
            onChange={(value) => updateSettings('backgroundType', value as 'default' | 'image')}
            name='backgroundType'
          >
            <Radio.Card value='default' my='sm'>
              <Group wrap='nowrap' align='flex-start'>
                <Radio.Indicator m='md' />
                <Stack gap={0}>
                  <Group gap='xs'>
                    <IconColorSwatch size='1rem' />
                    <Text my='sm'>Default Theme Background</Text>
                  </Group>
                  <Text c='dimmed' size='xs' mb='xs'>
                    Use the standard background color from your selected theme.
                  </Text>
                </Stack>
              </Group>
            </Radio.Card>

            <Radio.Card value='image' my='sm'>
              <Group wrap='nowrap' align='flex-start'>
                <Radio.Indicator m='md' />
                <Stack gap={0}>
                  <Group gap='xs'>
                    <IconWorldWww size='1rem' />
                    <Text my='sm'>Custom Background Image</Text>
                  </Group>
                  <Text c='dimmed' size='xs' mb='xs'>
                    Use a custom image URL as your background with blur effects.
                  </Text>
                </Stack>
              </Group>
            </Radio.Card>
          </Radio.Group>

          {settings.backgroundType === 'image' && (
            <TextInput
              label='Background Image URL'
              description='Enter the URL of the image you want to use as background. The image will be blurred (4px base, 8px for components).'
              placeholder='https://example.com/your-background-image.jpg'
              value={settings.backgroundImageUrl}
              onChange={(event) => updateSettings('backgroundImageUrl', event.currentTarget.value)}
              leftSection={<IconPhoto size='1rem' />}
            />
          )}
        </Stack>
      </Stack>
    </Paper>
  );
}
