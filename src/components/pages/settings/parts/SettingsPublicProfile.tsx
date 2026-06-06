import type { User } from '@/lib/db/models/user';
import { Response } from '@/lib/api/response';
import { fetchApi } from '@/lib/fetchApi';
import { useUserStore } from '@/lib/client/store/user';
import {
  Avatar,
  Box,
  Button,
  FileButton,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Switch,
  Text,
  TextInput,
  Title,
  Textarea,
  Divider,
  Tabs,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import {
  IconCheck,
  IconDeviceFloppy,
  IconExternalLink,
  IconLink,
  IconPencil,
  IconPhotoUp,
  IconTrash,
  IconUpload,
  IconUserCircle,
} from '@tabler/icons-react';
import { mutate } from 'swr';
import { useShallow } from 'zustand/shallow';
import { readToDataURL } from '@/lib/base64';
import { Link } from 'react-router-dom';
import { useState } from 'react';

export default function SettingsPublicProfile() {
  const [user, setUser] = useUserStore(useShallow((state) => [state.user, state.setUser]));

  if (!user) {
    return (
      <Paper withBorder p='sm'>
        <Title order={2}>Public Profile Settings</Title>
        <p>Loading…</p>
      </Paper>
    );
  }

  return <Form user={user} setUser={setUser} />;
}

function Form({ user, setUser }: { user: User; setUser: (u: User) => void }) {
  const [bannerUrl, setBannerUrl] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  const form = useForm({
    initialValues: {
      bio: user.view.bio ?? '',
      publicShowTotalViews: user.view.publicShowTotalViews !== false,
      publicShowTotalUploads: user.view.publicShowTotalUploads !== false,
      publicShowPrivateStats: user.view.publicShowPrivateStats !== false,
      publicShowPublicStats: user.view.publicShowPublicStats !== false,
    },
  });

  const onSubmit = async (values: typeof form.values) => {
    const { data, error } = await fetchApi<Response['/api/user']>('/api/user', 'PATCH', {
      view: {
        bio: values.bio || null,
        publicShowTotalViews: values.publicShowTotalViews,
        publicShowTotalUploads: values.publicShowTotalUploads,
        publicShowPrivateStats: values.publicShowPrivateStats,
        publicShowPublicStats: values.publicShowPublicStats,
      },
    });

    if (!data && error) {
      notifications.show({
        title: 'Error while updating settings',
        message: error.error,
        color: 'red',
        icon: <IconUserCircle size='1rem' />,
      });
      return;
    }

    if (!data?.user) return;

    mutate('/api/user');
    setUser(data.user);
    notifications.show({
      message: 'Public profile settings updated',
      color: 'green',
      icon: <IconCheck size='1rem' />,
    });
  };

  // ── Banner helpers ──────────────────────────────────────────────────────────
  const saveBanner = async (value: string | null, label = 'Banner') => {
    const { data, error } = await fetchApi<Response['/api/user']>('/api/user', 'PATCH', {
      view: { banner: value },
    });
    if (error || !data?.user) {
      notifications.show({ title: `Failed to update ${label}`, message: error?.error, color: 'red' });
    } else {
      mutate('/api/user');
      setUser(data.user);
      notifications.show({ message: `${label} updated!`, color: 'green' });
    }
  };

  const handleBannerUpload = async (file: File | null) => {
    if (!file) return;
    const base64url = await readToDataURL(file);
    await saveBanner(base64url, 'Banner');
  };

  const handleBannerUrl = async () => {
    const url = bannerUrl.trim();
    if (!url) return;
    // Store as a plain URL — the banner endpoint will detect data-URL vs plain URL
    await saveBanner(url, 'Banner');
    setBannerUrl('');
  };

  const handleBannerRemove = () => saveBanner(null, 'Banner');

  // ── Avatar helpers ──────────────────────────────────────────────────────────
  const saveAvatar = async (value: string | null, label = 'Avatar') => {
    const { data, error } = await fetchApi<Response['/api/user']>('/api/user', 'PATCH', {
      avatar: value,
    });
    if (error || !data?.user) {
      notifications.show({ title: `Failed to update ${label}`, message: error?.error, color: 'red' });
    } else {
      mutate('/api/user');
      setUser(data.user);
      notifications.show({ message: `${label} updated!`, color: 'green' });
    }
  };

  const handleAvatarUpload = async (file: File | null) => {
    if (!file) return;
    const base64url = await readToDataURL(file);
    await saveAvatar(base64url, 'Avatar');
  };

  const handleAvatarUrl = async () => {
    const url = avatarUrl.trim();
    if (!url) return;
    await saveAvatar(url, 'Avatar');
    setAvatarUrl('');
  };

  const handleAvatarRemove = () => saveAvatar(null, 'Avatar');

  // Banner preview: raw base64 or plain URL both work in CSS
  const bannerPreview = user.view.banner
    ? user.view.banner.startsWith('data:')
      ? `url(${user.view.banner})`
      : `url(${user.view.banner})`
    : null;

  return (
    <Paper withBorder p='sm'>
      <Group justify='space-between' mb='md'>
        <Title order={2}>Public Profile Settings</Title>
        <Button
          component={Link}
          to={`/user/${user.username}`}
          variant='light'
          leftSection={<IconExternalLink size='1rem' />}
          size='sm'
        >
          Open My Profile
        </Button>
      </Group>

      {/* ── Banner Section ─────────────────────────────────────────────────── */}
      <Stack gap='xs' mb='md'>
        <Text fw={500} size='sm'>
          Profile Banner
        </Text>
        <Box
          style={{
            borderRadius: 8,
            overflow: 'hidden',
            height: 120,
            background: bannerPreview
              ? `${bannerPreview} no-repeat center/cover`
              : 'linear-gradient(135deg, var(--mantine-color-blue-filled) 0%, var(--mantine-color-indigo-filled) 100%)',
            border: '1px solid var(--mantine-color-default-border)',
          }}
        />
        <Tabs defaultValue='upload' variant='outline'>
          <Tabs.List mb='xs'>
            <Tabs.Tab value='upload' leftSection={<IconUpload size='0.8rem' />}>
              Upload file
            </Tabs.Tab>
            <Tabs.Tab value='url' leftSection={<IconLink size='0.8rem' />}>
              Image URL
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value='upload'>
            <Group gap='xs'>
              <FileButton onChange={handleBannerUpload} accept='image/*'>
                {(props) => (
                  <Button {...props} size='xs' variant='light' leftSection={<IconPhotoUp size='0.8rem' />}>
                    Upload Banner
                  </Button>
                )}
              </FileButton>
              {user.view.banner && (
                <Button
                  size='xs'
                  variant='light'
                  color='red'
                  leftSection={<IconTrash size='0.8rem' />}
                  onClick={handleBannerRemove}
                >
                  Remove Banner
                </Button>
              )}
            </Group>
          </Tabs.Panel>

          <Tabs.Panel value='url'>
            <Group gap='xs' align='flex-end'>
              <TextInput
                placeholder='https://example.com/banner.gif'
                value={bannerUrl}
                onChange={(e) => setBannerUrl(e.currentTarget.value)}
                style={{ flex: 1 }}
                size='xs'
              />
              <Button size='xs' variant='light' onClick={handleBannerUrl} disabled={!bannerUrl.trim()}>
                Set Banner
              </Button>
              {user.view.banner && (
                <Button
                  size='xs'
                  variant='light'
                  color='red'
                  leftSection={<IconTrash size='0.8rem' />}
                  onClick={handleBannerRemove}
                >
                  Remove
                </Button>
              )}
            </Group>
          </Tabs.Panel>
        </Tabs>
      </Stack>

      {/* ── Avatar Section ─────────────────────────────────────────────────── */}
      <Stack gap='xs' mb='md'>
        <Text fw={500} size='sm'>
          Profile Avatar
        </Text>
        <Group gap='sm' align='flex-start'>
          <Avatar
            src={user.avatar || null}
            size={64}
            radius={64}
            style={{ border: '3px solid var(--mantine-color-default-border)', flexShrink: 0 }}
          />
          <Tabs defaultValue='upload' variant='outline' style={{ flex: 1 }}>
            <Tabs.List mb='xs'>
              <Tabs.Tab value='upload' leftSection={<IconUpload size='0.8rem' />}>
                Upload file
              </Tabs.Tab>
              <Tabs.Tab value='url' leftSection={<IconLink size='0.8rem' />}>
                Image URL
              </Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value='upload'>
              <Group gap='xs'>
                <FileButton onChange={handleAvatarUpload} accept='image/*'>
                  {(props) => (
                    <Button {...props} size='xs' variant='light' leftSection={<IconPencil size='0.8rem' />}>
                      Change Avatar
                    </Button>
                  )}
                </FileButton>
                {user.avatar && (
                  <Button
                    size='xs'
                    variant='light'
                    color='red'
                    leftSection={<IconTrash size='0.8rem' />}
                    onClick={handleAvatarRemove}
                  >
                    Remove Avatar
                  </Button>
                )}
              </Group>
            </Tabs.Panel>

            <Tabs.Panel value='url'>
              <Group gap='xs' align='flex-end'>
                <TextInput
                  placeholder='https://example.com/avatar.gif'
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.currentTarget.value)}
                  style={{ flex: 1 }}
                  size='xs'
                />
                <Button size='xs' variant='light' onClick={handleAvatarUrl} disabled={!avatarUrl.trim()}>
                  Set Avatar
                </Button>
                {user.avatar && (
                  <Button
                    size='xs'
                    variant='light'
                    color='red'
                    leftSection={<IconTrash size='0.8rem' />}
                    onClick={handleAvatarRemove}
                  >
                    Remove
                  </Button>
                )}
              </Group>
            </Tabs.Panel>
          </Tabs>
        </Group>
      </Stack>

      <Divider mb='md' />

      <form onSubmit={form.onSubmit(onSubmit)}>
        <Stack gap='sm'>
          <Textarea
            label='Bio'
            placeholder='Write a short bio...'
            description='Shown on your public profile page. Supports Markdown. Links open in a new tab.'
            maxRows={4}
            autosize
            {...form.getInputProps('bio')}
          />

          <Title order={3} mt='sm'>
            Statistics Visibility
          </Title>

          <SimpleGrid cols={{ base: 1, md: 2 }} spacing='sm'>
            <Switch
              label='Show Total Views'
              description='Show sum of views for all files on your public profile'
              {...form.getInputProps('publicShowTotalViews', { type: 'checkbox' })}
            />

            <Switch
              label='Show Total Uploads'
              description='Show count of all files uploaded on your public profile'
              {...form.getInputProps('publicShowTotalUploads', { type: 'checkbox' })}
            />

            <Switch
              label='Show Public Files Count'
              description='Show how many of your files are public'
              {...form.getInputProps('publicShowPublicStats', { type: 'checkbox' })}
            />

            <Switch
              label='Show Private Files Count'
              description='Show how many of your files are private'
              {...form.getInputProps('publicShowPrivateStats', { type: 'checkbox' })}
            />
          </SimpleGrid>

          <Group justify='left' mt='sm'>
            <Button type='submit' leftSection={<IconDeviceFloppy size='1rem' />}>
              Save Settings
            </Button>
          </Group>
        </Stack>
      </form>
    </Paper>
  );
}
