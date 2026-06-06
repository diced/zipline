import { useParams, Link } from 'react-router-dom';
import useSWR from 'swr';
import {
  Container,
  Paper,
  Title,
  Text,
  Avatar,
  Group,
  SimpleGrid,
  Card,
  Stack,
  Center,
  Loader,
  Button,
  Badge,
  FileButton,
  ActionIcon,
  Modal,
  TextInput,
} from '@mantine/core';
import {
  IconCalendar,
  IconEye,
  IconFile,
  IconArrowLeft,
  IconFolders,
  IconLayoutGrid,
  IconLock,
  IconWorld,
  IconPhotoUp,
  IconTrash,
  IconPencil,
  IconLink,
} from '@tabler/icons-react';
import { useTitle } from '@/lib/client/hooks/useTitle';
import { bytes } from '@/lib/bytes';
import RelativeDate from '@/components/RelativeDate';
import { useUserStore } from '@/lib/client/store/user';
import { readToDataURL } from '@/lib/base64';
import { fetchApi } from '@/lib/fetchApi';
import { notifications } from '@mantine/notifications';
import { useState, useMemo, useEffect } from 'react';
import DashboardFileModal from '@/components/file/DashboardFile/DashboardFileModal';
import { useFileNavStore } from '@/lib/client/store/fileNav';
import Markdown from '@/components/render/Markdown';

const customStyles = `
  .gallery-card {
    transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
    cursor: pointer;
  }
  .gallery-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.4);
    border-color: var(--mantine-color-blue-filled) !important;
  }
  .media-preview-container {
    position: relative;
    overflow: hidden;
    background-color: #1e1f22;
    aspect-ratio: 16 / 9;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .media-preview-container img, .media-preview-container video {
    transition: transform 0.3s ease;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .gallery-card:hover .media-preview-container img {
    transform: scale(1.05);
  }
  /* Prevent browser link-preview tooltip on card clicks */
  .gallery-card * {
    pointer-events: none;
  }
  .profile-banner {
    height: 140px;
    border-top-left-radius: 8px;
    border-top-right-radius: 8px;
    position: relative;
  }
  .banner-overlay {
    position: absolute;
    inset: 0;
    background: rgba(0,0,0,0);
    transition: background 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    border-top-left-radius: 8px;
    border-top-right-radius: 8px;
  }
  .banner-overlay:hover {
    background: rgba(0,0,0,0.45);
  }
  .banner-overlay .banner-btns {
    opacity: 0;
    transition: opacity 0.2s;
    display: flex;
    gap: 8px;
  }
  .banner-overlay:hover .banner-btns {
    opacity: 1;
  }
`;

export function Component() {
  const { username } = useParams<{ username: string }>();
  useTitle(`${username}'s Profile`);

  const currentUser = useUserStore((state) => state.user);

  const { data, error, isLoading, mutate } = useSWR<{
    user: {
      username: string;
      avatar: string | null;
      banner: string | null;
      bio: string | null;
      createdAt: string;
      stats?: {
        totalViews: number | null;
        totalUploads: number | null;
        privateUploads: number | null;
        publicUploads: number | null;
      };
    };
    files: {
      id: string;
      name: string;
      originalName: string | null;
      type: string;
      size: number;
      views: number;
      createdAt: string;
      url: string;
      thumbnail?: {
        path: string;
      } | null;
    }[];
  }>(username ? `/api/users/${username}/public` : null);

  const [selectedFile, setSelectedFile] = useState<any | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  // Link upload / setting modals
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [linkModalType, setLinkModalType] = useState<'avatar' | 'banner'>('avatar');
  const [linkInput, setLinkInput] = useState('');
  const [avatarEditModalOpen, setAvatarEditModalOpen] = useState(false);

  const openLinkModal = (type: 'avatar' | 'banner') => {
    setLinkModalType(type);
    setLinkInput('');
    setLinkModalOpen(true);
  };

  const handleLinkSave = async () => {
    const url = linkInput.trim();
    if (!url) return;

    if (linkModalType === 'avatar') {
      const { error: resError } = await fetchApi('/api/user', 'PATCH', {
        avatar: url,
      });
      if (resError) {
        notifications.show({ title: 'Error updating avatar', message: resError.error, color: 'red' });
      } else {
        notifications.show({ message: 'Avatar updated successfully!', color: 'green' });
        mutate();
      }
    } else {
      const { error: resError } = await fetchApi('/api/user', 'PATCH', {
        view: { banner: url },
      });
      if (resError) {
        notifications.show({ title: 'Error updating banner', message: resError.error, color: 'red' });
      } else {
        notifications.show({ message: 'Profile banner updated successfully!', color: 'green' });
        mutate();
      }
    }

    setLinkModalOpen(false);
  };

  const setFiles = useFileNavStore((state) => state.setFiles);
  const setCurrent = useFileNavStore((state) => state.setCurrent);

  const fileIds = useMemo(() => (data?.files ?? []).map((file) => file.id), [data?.files]);

  useEffect(() => {
    if (data?.files) {
      setFiles(fileIds);
    }
  }, [fileIds, data?.files, setFiles]);

  useEffect(() => {
    const handleDragStart = (e: DragEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'IMG' || target.tagName === 'VIDEO')) {
        e.preventDefault();
      }
    };

    const handleLinkClick = (e: MouseEvent) => {
      let target = e.target as HTMLElement | null;
      while (target && target.tagName !== 'A') {
        target = target.parentElement;
      }
      if (target && target.tagName === 'A') {
        const href = target.getAttribute('href');
        if (
          href &&
          (href.startsWith('http://') ||
            href.startsWith('https://') ||
            href.startsWith('/raw/') ||
            href.startsWith('/view/') ||
            href.startsWith('/u/'))
        ) {
          target.setAttribute('target', '_blank');
          target.setAttribute('rel', 'noopener noreferrer');
        }
      }
    };

    document.addEventListener('dragstart', handleDragStart);
    document.addEventListener('click', handleLinkClick);
    return () => {
      document.removeEventListener('dragstart', handleDragStart);
      document.removeEventListener('click', handleLinkClick);
    };
  }, []);

  const handleCardClick = (file: any) => {
    setSelectedFile(file);
    setCurrent(file.id);
    setPreviewOpen(true);
  };

  const currentFileId = useFileNavStore((state) => state.current);
  const activeFile =
    !currentFileId || !data?.files
      ? selectedFile
      : data.files.find((f) => f.id === currentFileId) || selectedFile;

  const handleBannerUpload = async (file: File | null) => {
    if (!file) return;
    const base64url = await readToDataURL(file);
    const { error: resError } = await fetchApi('/api/user', 'PATCH', {
      view: { banner: base64url },
    });

    if (resError) {
      notifications.show({
        title: 'Error updating banner',
        message: resError.error,
        color: 'red',
      });
    } else {
      notifications.show({
        message: 'Profile banner updated successfully!',
        color: 'green',
      });
      mutate();
    }
  };

  const handleBannerRemove = async () => {
    const { error: resError } = await fetchApi('/api/user', 'PATCH', {
      view: { banner: null },
    });

    if (resError) {
      notifications.show({
        title: 'Error removing banner',
        message: resError.error,
        color: 'red',
      });
    } else {
      notifications.show({
        message: 'Profile banner removed successfully!',
        color: 'green',
      });
      mutate();
    }
  };

  const handleAvatarUpload = async (file: File | null) => {
    if (!file) return;
    const base64url = await readToDataURL(file);
    const { error: resError } = await fetchApi('/api/user', 'PATCH', {
      avatar: base64url,
    });

    if (resError) {
      notifications.show({
        title: 'Error updating avatar',
        message: resError.error,
        color: 'red',
      });
    } else {
      notifications.show({
        message: 'Avatar updated successfully!',
        color: 'green',
      });
      mutate();
    }
  };

  if (isLoading) {
    return (
      <Center style={{ height: '100vh', flexDirection: 'column', gap: '12px' }}>
        <Loader size='xl' />
        <Text c='dimmed'>Loading public profile...</Text>
      </Center>
    );
  }

  if (error || !data) {
    return (
      <Center style={{ height: '100vh', flexDirection: 'column', gap: '16px' }}>
        <Title order={1}>404 - Profile Not Found</Title>
        <Text c='dimmed'>The user profile you are looking for does not exist or has been removed.</Text>
        <Button component={Link} to='/' leftSection={<IconArrowLeft size='1rem' />}>
          Go Home
        </Button>
      </Center>
    );
  }

  const { user, files } = data;
  const isOwner = currentUser?.username === user.username;

  return (
    <Container size='lg' py='xl'>
      <style dangerouslySetInnerHTML={{ __html: customStyles }} />

      <DashboardFileModal
        open={previewOpen}
        setOpen={setPreviewOpen}
        file={activeFile}
        reduce={true}
        sequenced
      />

      <Modal
        opened={linkModalOpen}
        onClose={() => setLinkModalOpen(false)}
        title={`Set ${linkModalType === 'avatar' ? 'Avatar' : 'Banner'} URL`}
        centered
      >
        <Stack gap='sm'>
          <TextInput
            label='Image URL'
            placeholder={`https://example.com/${linkModalType}.gif`}
            value={linkInput}
            onChange={(e) => setLinkInput(e.currentTarget.value)}
            required
            autoFocus
          />
          <Group justify='flex-end' mt='md'>
            <Button variant='subtle' onClick={() => setLinkModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleLinkSave} disabled={!linkInput.trim()}>
              Save
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={avatarEditModalOpen}
        onClose={() => setAvatarEditModalOpen(false)}
        title='Update Avatar'
        centered
      >
        <Stack gap='sm'>
          <FileButton
            onChange={(file) => {
              setAvatarEditModalOpen(false);
              handleAvatarUpload(file);
            }}
            accept='image/*'
          >
            {(props) => (
              <Button {...props} fullWidth variant='light' leftSection={<IconPhotoUp size='1rem' />}>
                Upload Image file
              </Button>
            )}
          </FileButton>

          <Button
            fullWidth
            variant='light'
            leftSection={<IconLink size='1rem' />}
            onClick={() => {
              setAvatarEditModalOpen(false);
              openLinkModal('avatar');
            }}
          >
            Set Avatar from URL Link
          </Button>

          {user.avatar && (
            <Button
              fullWidth
              variant='light'
              color='red'
              leftSection={<IconTrash size='1rem' />}
              onClick={async () => {
                setAvatarEditModalOpen(false);
                const { error: resError } = await fetchApi('/api/user', 'PATCH', {
                  avatar: null,
                });
                if (resError) {
                  notifications.show({
                    title: 'Error removing avatar',
                    message: resError.error,
                    color: 'red',
                  });
                } else {
                  notifications.show({ message: 'Avatar removed successfully!', color: 'green' });
                  mutate();
                }
              }}
            >
              Remove Avatar
            </Button>
          )}
        </Stack>
      </Modal>

      {currentUser && currentUser.username !== user.username && (
        <Group justify='flex-end' mb='lg'>
          <Button component={Link} to={`/user/${currentUser.username}`} variant='outline'>
            My Profile
          </Button>
        </Group>
      )}

      {/* User Header Profile Card */}
      <Paper withBorder radius='md' mb='xl' style={{ overflow: 'hidden', position: 'relative' }}>
        <div
          className='profile-banner'
          style={{
            background: user.banner
              ? `url(${user.banner}) no-repeat center/cover`
              : 'linear-gradient(135deg, var(--mantine-color-blue-filled) 0%, var(--mantine-color-indigo-filled) 100%)',
          }}
        >
          {isOwner && (
            <div className='banner-overlay'>
              <div className='banner-btns'>
                <FileButton onChange={handleBannerUpload} accept='image/*'>
                  {(props) => (
                    <Button {...props} size='xs' variant='white' leftSection={<IconPhotoUp size='0.8rem' />}>
                      Upload
                    </Button>
                  )}
                </FileButton>
                <Button
                  size='xs'
                  variant='white'
                  leftSection={<IconLink size='0.8rem' />}
                  onClick={() => openLinkModal('banner')}
                >
                  Link
                </Button>
                {user.banner && (
                  <Button
                    size='xs'
                    variant='white'
                    color='red'
                    leftSection={<IconTrash size='0.8rem' />}
                    onClick={handleBannerRemove}
                  >
                    Remove
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
        <Container size='md' style={{ marginTop: '-50px', paddingBottom: '24px' }}>
          <Stack align='center' gap='sm'>
            <div style={{ position: 'relative' }}>
              <Avatar
                src={user.avatar || null}
                size={100}
                radius={100}
                style={{ border: '4px solid var(--mantine-color-body)' }}
              />
              {isOwner && (
                <ActionIcon
                  size='md'
                  radius='xl'
                  variant='filled'
                  color='blue'
                  pos='absolute'
                  bottom={0}
                  right={0}
                  style={{
                    border: '2px solid var(--mantine-color-body)',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                  }}
                  onClick={() => setAvatarEditModalOpen(true)}
                >
                  <IconPencil size='0.9rem' />
                </ActionIcon>
              )}
            </div>
            <Title order={1}>{user.username}</Title>

            <Group gap='md' c='dimmed'>
              <Group gap='xs'>
                <IconCalendar size='1rem' />
                <Text size='sm'>
                  Joined <RelativeDate date={new Date(user.createdAt)} />
                </Text>
              </Group>
              <Group gap='xs'>
                <IconLayoutGrid size='1rem' />
                <Text size='sm'>{files.length} public uploads</Text>
              </Group>
            </Group>

            {user.bio && (
              <div style={{ maxWidth: '600px', textAlign: 'center', wordBreak: 'break-word' }}>
                <Markdown md={user.bio} plain />
              </div>
            )}

            {/* Statistics Section */}
            {user.stats && (
              <Group gap='lg' justify='center' mt='xs' c='dimmed'>
                {user.stats.totalViews !== null && (
                  <Group gap='xs'>
                    <IconEye size='1.1rem' style={{ color: 'var(--mantine-color-blue-filled)' }} />
                    <Text size='sm' fw={500}>
                      {user.stats.totalViews.toLocaleString()} views
                    </Text>
                  </Group>
                )}
                {user.stats.totalUploads !== null && (
                  <Group gap='xs'>
                    <IconFile size='1.1rem' style={{ color: 'var(--mantine-color-indigo-filled)' }} />
                    <Text size='sm' fw={500}>
                      {user.stats.totalUploads.toLocaleString()} uploads
                    </Text>
                  </Group>
                )}
                {user.stats.publicUploads !== null && (
                  <Group gap='xs'>
                    <IconWorld size='1.1rem' style={{ color: 'var(--mantine-color-green-filled)' }} />
                    <Text size='sm' fw={500}>
                      {user.stats.publicUploads.toLocaleString()} public
                    </Text>
                  </Group>
                )}
                {user.stats.privateUploads !== null && user.stats.privateUploads > 0 && (
                  <Group gap='xs'>
                    <IconLock size='1.1rem' style={{ color: 'var(--mantine-color-red-filled)' }} />
                    <Text size='sm' fw={500}>
                      {user.stats.privateUploads.toLocaleString()} private
                    </Text>
                  </Group>
                )}
              </Group>
            )}
          </Stack>
        </Container>
      </Paper>

      {/* Public Gallery Section */}
      <Stack gap='md'>
        <Group align='center' gap='xs'>
          <IconFolders size='1.5rem' />
          <Title order={2}>/public/gallery</Title>
        </Group>

        {files.length === 0 ? (
          <Paper withBorder p='xl' radius='md' style={{ textAlign: 'center' }}>
            <Text size='lg' fw={500} mb='xs'>
              No public files
            </Text>
            <Text c='dimmed'>This user hasn&apos;t made any files public yet.</Text>
          </Paper>
        ) : (
          <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing='lg'>
            {files.map((file) => {
              const isImage = file.type.startsWith('image/');
              const isVideo = file.type.startsWith('video/');
              const thumbnailUrl = file.thumbnail ? `/raw/${file.thumbnail.path}` : null;
              const rawUrl = `/raw/${file.name}`;
              const displayUrl = thumbnailUrl || rawUrl;

              return (
                <Card
                  key={file.id}
                  withBorder
                  padding='md'
                  radius='md'
                  className='gallery-card'
                  onClick={() => handleCardClick(file)}
                  style={{ cursor: 'pointer' }}
                >
                  <Card.Section className='media-preview-container'>
                    {isImage ? (
                      <img src={displayUrl} alt={file.originalName || file.name} loading='lazy' />
                    ) : isVideo ? (
                      thumbnailUrl ? (
                        <img src={thumbnailUrl} alt={file.originalName || file.name} loading='lazy' />
                      ) : (
                        <video src={rawUrl} preload='metadata' muted />
                      )
                    ) : (
                      <Center style={{ height: '100%', flexDirection: 'column', gap: '8px' }}>
                        <IconFile size='3rem' style={{ color: 'var(--mantine-color-dimmed)' }} />
                        <Text
                          size='xs'
                          c='dimmed'
                          style={{ maxWidth: '80%', textAlign: 'center', wordBreak: 'break-all' }}
                        >
                          {file.type}
                        </Text>
                      </Center>
                    )}
                  </Card.Section>

                  <Stack mt='md' gap='xs'>
                    <Text fw={600} size='sm' truncate>
                      {file.originalName || file.name}
                    </Text>

                    <Group justify='space-between' mt='xs'>
                      <Badge variant='light' color='blue'>
                        {bytes(file.size)}
                      </Badge>
                      <Group gap={4}>
                        <IconEye size='0.9rem' style={{ color: 'var(--mantine-color-dimmed)' }} />
                        <Text size='xs' c='dimmed'>
                          {file.views} views
                        </Text>
                      </Group>
                    </Group>

                    <Text size='xs' c='dimmed'>
                      Uploaded <RelativeDate date={new Date(file.createdAt)} />
                    </Text>
                  </Stack>
                </Card>
              );
            })}
          </SimpleGrid>
        )}
      </Stack>
    </Container>
  );
}

Component.displayName = 'UserProfile';
