import { useUploadOptionsStore } from '@/lib/store/uploadOptions';
import {
  ActionIcon,
  Button,
  Group,
  Paper,
  Progress,
  Stack,
  Text,
  Title,
  Container,
  Card,
  Badge,
  Box,
  Center,
  RingProgress,
  ThemeIcon,
  Menu,
  Avatar,
  TextInput,
  Modal,
} from '@mantine/core';
import { Dropzone } from '@mantine/dropzone';
import { useClipboard, useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import {
  IconFiles,
  IconTrashFilled,
  IconUpload,
  IconX,
  IconSettings,
  IconClipboard,
  IconDragDrop,
  IconCloudUpload,
  IconCopy,
  IconMarkdown,
  IconCode,
  IconLink,
  IconBrandGithub,
  IconBrandDiscord,
  IconDashboard,
  IconDownload,
  IconCheck,
  IconDatabase,
  IconClock,
  IconUsers,
  IconFolder,
  IconFileUpload,
  IconFileXFilled,
} from '@tabler/icons-react';
import { useEffect, useState, useRef } from 'react';
import Head from 'next/head';

import { bytes } from '@/lib/bytes';
import { humanizeDuration } from '@/lib/relativeTime';
import { useShallow } from 'zustand/shallow';
import { withSafeConfig } from '@/lib/middleware/next/withSafeConfig';
import { InferGetServerSidePropsType } from 'next';
import { useRouter } from 'next/router';
import { useUserStore } from '@/lib/store/user';
import { useSettingsStore } from '@/lib/store/settings';
import useAvatar from '@/lib/hooks/useAvatar';
import useSWR from 'swr';
import type { Response } from '@/lib/api/response';

interface UploadedFile {
  id: string;
  url: string;
  name: string;
  size: number;
  type: string;
}

export default function StandaloneUpload({ config }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const router = useRouter();
  const clipboard = useClipboard();

  // Use SWR directly for user data without forced redirects
  const {
    data: userData,
    error: userError,
    isLoading: authLoading,
  } = useSWR<Response['/api/user']>('/api/user', {
    fallbackData: { user: undefined },
  });

  const { user: userStoreUser, setUser: setUserStoreUser } = useUserStore();
  const [backgroundType, backgroundImageUrl] = useSettingsStore(
    useShallow((state) => [state.settings.backgroundType, state.settings.backgroundImageUrl]),
  );

  // Use avatar hook like dashboard
  const { avatar } = useAvatar();

  // Use SWR for stats like dashboard
  const { data: stats } = useSWR<Response['/api/user/stats']>('/api/user/stats');

  const user = userData?.user;
  const isAuthenticated = !!user;

  // Set user in store if available, but don't force redirects
  useEffect(() => {
    if (userData?.user) {
      console.log('User data received:', userData.user);
      setUserStoreUser(userData.user);
    }
  }, [userData, setUserStoreUser]);

  // Debug avatar data
  useEffect(() => {
    console.log('Avatar data:', avatar);
    console.log('User data:', user);
  }, [avatar, user]);

  // Check if public uploads are enabled
  // TODO: Implement API endpoint to check if public uploads are enabled
  // This could be a config setting or admin-controlled setting
  // For now, we'll assume public uploads are enabled
  const publicUploadEnabled = true;

  // Upload state
  const { options, ephemeral, clearEphemeral, setOption } = useUploadOptionsStore(
    useShallow((state) => ({
      options: state.options,
      ephemeral: state.ephemeral,
      clearEphemeral: state.clearEphemeral,
      setOption: state.setOption,
    })),
  );

  const [files, setFiles] = useState<File[]>([]);
  const [folders, setFolders] = useState<{ name: string; files: File[] }[]>([]);
  const [progress, setProgress] = useState<{ percent: number; remaining: number; speed: number }>({
    percent: 0,
    remaining: 0,
    speed: 0,
  });
  const [uploading, setUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [urlDownloadOpened, { open: openUrlDownload, close: closeUrlDownload }] = useDisclosure(false);
  const [downloadUrl, setDownloadUrl] = useState('');
  const [downloadingFromUrl, setDownloadingFromUrl] = useState(false);
  const [uploadInProgress, setUploadInProgress] = useState(false);
  const uploadRef = useRef<{ [key: string]: boolean }>({});
  const isUploadingRef = useRef(false);

  // Simple metrics for now
  const metrics = {
    totalStorage: '0 B',
    totalFiles: 0,
    uptime: '0 minutes',
    totalUsers: 0,
  };

  // Clipboard paste handler
  const handleClipboardPaste = (e: ClipboardEvent) => {
    if (!e.clipboardData) return;

    const pastedFiles: File[] = [];
    for (let i = 0; i < e.clipboardData.items.length; i++) {
      const item = e.clipboardData.items[i];
      if (item.type.startsWith('image/')) {
        const blob = item.getAsFile();
        if (blob) {
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const extension = item.type.split('/')[1] || 'png';
          const newBlob = new File([blob], `clipboard-${timestamp}.${extension}`, { type: blob.type });
          pastedFiles.push(newBlob);
        }
      }
    }

    if (pastedFiles.length > 0) {
      handleFilesAdded(pastedFiles);
      notifications.show({
        title: 'Images pasted from clipboard',
        message: `Added ${pastedFiles.length} image${pastedFiles.length !== 1 ? 's' : ''} from clipboard`,
        color: 'green',
        icon: <IconClipboard size='1rem' />,
        autoClose: 3000,
      });
    }
  };

  // Custom upload function that captures response and auto-copies links
  const customUploadFiles = async (files: File[]) => {
    const body = new FormData();
    for (let i = 0; i !== files.length; ++i) {
      body.append('file', files[i]);
    }

    const headers: Record<string, string> = {};
    options.deletesAt !== 'never' && (headers['x-zipline-deletes-at'] = options.deletesAt);
    options.format !== 'default' && (headers['x-zipline-format'] = options.format);
    options.imageCompressionPercent && (headers['x-zipline-image-compression-percent'] = options.imageCompressionPercent.toString());
    options.maxViews && (headers['x-zipline-max-views'] = options.maxViews.toString());
    options.addOriginalName && (headers['x-zipline-original-name'] = 'true');
    options.overrides_returnDomain && (headers['x-zipline-domain'] = options.overrides_returnDomain);
    ephemeral.password && (headers['x-zipline-password'] = ephemeral.password);
    ephemeral.filename && (headers['x-zipline-filename'] = encodeURIComponent(ephemeral.filename));
    if (ephemeral.folderId) {
      headers['x-zipline-folder'] = ephemeral.folderId;
    }

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body,
        headers,
      });

      if (response.ok) {
        const result = await response.json();
        
        // Update uploaded files state with the response
        if (result.files && Array.isArray(result.files)) {
          setUploadedFiles((prev) => [...prev, ...result.files]);
          
          // Auto-copy links to clipboard
          const urls = result.files.map((f: any) => f.url);
          if (urls.length > 0) {
            try {
              await navigator.clipboard.writeText(urls.join('\n'));
              notifications.show({
                title: 'Links copied to clipboard!',
                message: `${urls.length} file link${urls.length !== 1 ? 's' : ''} automatically copied`,
                color: 'green',
                icon: <IconClipboard size='1rem' />,
                autoClose: 4000,
              });
            } catch (err) {
              // Fallback for older browsers
              const textArea = document.createElement('textarea');
              textArea.value = urls.join('\n');
              document.body.appendChild(textArea);
              textArea.select();
              document.execCommand('copy');
              document.body.removeChild(textArea);
              
              notifications.show({
                title: 'Links copied to clipboard!',
                message: `${urls.length} file link${urls.length !== 1 ? 's' : ''} automatically copied`,
                color: 'green',
                icon: <IconClipboard size='1rem' />,
                autoClose: 4000,
              });
            }
          }
        }
        
        // Clear files after successful upload
        setFiles([]);
        setFolders([]);
        
        notifications.show({
          title: 'Upload successful!',
          message: `Successfully uploaded ${files.length} file${files.length !== 1 ? 's' : ''}`,
          color: 'green',
          icon: <IconFileUpload size='1rem' />,
          autoClose: 4000,
        });
      } else {
        throw new Error('Upload failed');
      }
    } catch (error) {
      notifications.show({
        title: 'Upload failed',
        message: 'An error occurred during upload',
        color: 'red',
        icon: <IconFileXFilled size='1rem' />,
        autoClose: 5000,
      });
    } finally {
      setUploading(false);
      setProgress({ percent: 0, remaining: 0, speed: 0 });
      setUploadInProgress(false); // Reset upload flag
      isUploadingRef.current = false; // Reset ref flag
      clearEphemeral();
    }
  };

  // File handling
  const getAllFiles = () => {
    const allFiles = [...files];
    folders.forEach((folder) => {
      allFiles.push(...folder.files);
    });
    return allFiles;
  };

  const handleFilesAdded = (newFiles: File[]) => {
    if (newFiles.length === 0) return;
    
    // SIMPLE: Just add files to state
    setFiles((prev) => {
      const newFileList = [...prev, ...newFiles];
      
      // Trigger upload after state update
      setTimeout(() => {
        startAutoUpload(newFiles);
      }, 50);
      
      return newFileList;
    });
  };

  const startAutoUpload = (filesToUpload: File[]) => {
    // Prevent multiple uploads
    if (isUploadingRef.current || uploading || uploadInProgress) {
      return;
    }
    
    // Check if upload is allowed
    if (!isAuthenticated && !publicUploadEnabled) {
      notifications.show({
        title: 'Upload not allowed',
        message: 'Please log in to upload files or contact admin to enable public uploads',
        color: 'red',
        autoClose: 5000,
      });
      return;
    }
    
    // Mark as uploading
    isUploadingRef.current = true;
    setUploadInProgress(true);
    setUploading(true);
    
    notifications.show({
      title: 'Auto-upload started',
      message: `Uploading ${filesToUpload.length} file${filesToUpload.length !== 1 ? 's' : ''} automatically`,
      color: 'blue',
      icon: <IconUpload size='1rem' />,
      autoClose: 3000,
    });
    
    // Start upload
    customUploadFiles(filesToUpload);
  };

  const handleFileRemove = (index: number) => {
    // Add fade-out animation before removing
    const fileElement = document.querySelector(`[data-file-index="${index}"]`) as HTMLElement;
    if (fileElement) {
      fileElement.style.transition = 'all 0.3s ease';
      fileElement.style.opacity = '0';
      fileElement.style.transform = 'translateX(-20px)';
      
      setTimeout(() => {
        setFiles((prev) => prev.filter((_, i) => i !== index));
      }, 300);
    } else {
      setFiles((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const handleClearAll = () => {
    setFiles([]);
    setFolders([]);
    setUploadedFiles([]);
    clearEphemeral();
  };

  // URL download handler
  const handleUrlDownload = async () => {
    if (!downloadUrl.trim()) return;

    setDownloadingFromUrl(true);
    try {
      const response = await fetch('/api/download-from-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: downloadUrl }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const filename = downloadUrl.split('/').pop() || 'downloaded-file';
        const file = new File([blob], filename, { type: blob.type });
        handleFilesAdded([file]);
        setDownloadUrl('');
        closeUrlDownload();
        notifications.show({
          title: 'File downloaded',
          message: 'Successfully downloaded from URL',
          color: 'green',
        });
        
        // handleFilesAdded now handles auto-upload automatically
      } else {
        throw new Error('Failed to download');
      }
    } catch (error) {
      notifications.show({
        title: 'Download failed',
        message: 'Could not download file from URL',
        color: 'red',
      });
    }
    setDownloadingFromUrl(false);
  };

  // Upload handler - no longer needed since auto-upload is enabled
  // const handleUpload = () => { ... };

  // Copy options
  const copyAsLink = (urls: string[]) => {
    const text = urls.join('\n');
    clipboard.copy(text);
    notifications.show({
      title: 'Links copied',
      message: 'File links copied to clipboard',
      color: 'green',
      icon: <IconCopy size='1rem' />,
    });
  };

  const copyAsMarkdown = (files: UploadedFile[]) => {
    const text = files
      .map((file) =>
        file.type.startsWith('image/') ? `![${file.name}](${file.url})` : `[${file.name}](${file.url})`,
      )
      .join('\n');
    clipboard.copy(text);
    notifications.show({
      title: 'Markdown copied',
      message: 'Markdown format copied to clipboard',
      color: 'green',
      icon: <IconMarkdown size='1rem' />,
    });
  };

  const copyAsEmbed = (files: UploadedFile[]) => {
    const text = files
      .map((file) =>
        file.type.startsWith('image/')
          ? `<img src="${file.url}" alt="${file.name}" />`
          : `<a href="${file.url}">${file.name}</a>`,
      )
      .join('\n');
    clipboard.copy(text);
    notifications.show({
      title: 'HTML copied',
      message: 'HTML embed code copied to clipboard',
      color: 'green',
      icon: <IconCode size='1rem' />,
    });
  };

  useEffect(() => {
    document.addEventListener('paste', handleClipboardPaste);
    window.addEventListener('beforeunload', clearEphemeral);

    return () => {
      document.removeEventListener('paste', handleClipboardPaste);
      window.removeEventListener('beforeunload', clearEphemeral);
    };
  }, []);

  // Background style - only show custom background if user is logged in
  const backgroundStyle = isAuthenticated && backgroundType === 'image' && backgroundImageUrl && backgroundImageUrl.trim() !== ''
    ? {
        backgroundImage: `url("${backgroundImageUrl}")`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        filter: 'blur(10px)',
      }
    : {
        background: 'linear-gradient(135deg, #0f0f0f 0%, #1a1a1a 100%)', // Darker background
      };

  // Show loading overlay while authentication is loading
  if (authLoading) {
    return (
      <Box
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #1a1b1e 0%, #2d2f33 100%)',
        }}
      >
        <Text size='xl' c='dimmed'>
          Loading...
        </Text>
      </Box>
    );
  }

  return (
    <Box
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Head>
        <title>Upload - Zipline</title>
        <meta name='description' content='Upload and share your files instantly with Zipline' />
        <meta name='viewport' content='width=device-width, initial-scale=1' />
        <style>{`
          @keyframes slideInUp {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          
          @keyframes slideInLeft {
            from {
              opacity: 0;
              transform: translateX(-20px);
            }
            to {
              opacity: 1;
              transform: translateX(0);
            }
          }
          
          @keyframes fadeIn {
            from {
              opacity: 0;
            }
            to {
              opacity: 1;
            }
          }
          
          @keyframes scaleIn {
            from {
              opacity: 0;
              transform: scale(0.8);
            }
            to {
              opacity: 1;
              transform: scale(1);
            }
          }
          
          .file-added {
            animation: slideInRight 0.3s ease-out;
          }
          
          @keyframes slideInRight {
            from {
              opacity: 0;
              transform: translateX(20px);
            }
            to {
              opacity: 1;
              transform: translateX(0);
            }
          }
          
          @keyframes pulse {
            0% {
              transform: scale(1);
            }
            50% {
              transform: scale(1.05);
            }
            100% {
              transform: scale(1);
            }
          }
        `}</style>
      </Head>

      {/* Background */}
      <Box
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: -1,
          ...backgroundStyle,
        }}
      />

      {/* Background overlay for blur effect - only for logged in users */}
      {isAuthenticated && backgroundType === 'image' && backgroundImageUrl && backgroundImageUrl.trim() !== '' && (
        <Box
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.3)',
            backdropFilter: 'blur(10px)',
            zIndex: -1,
          }}
        />
      )}
      {/* Header */}
      <Paper
        radius={0}
        p='md'
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.15)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}
      >
        <Container size='xl'>
          <Group justify='space-between' align='center'>
            {/* Logo */}
            <Group gap='md'>
              <ThemeIcon size={40} radius='md' variant='gradient'>
                <IconCloudUpload size='1.5rem' />
              </ThemeIcon>
              <Text size='xl' fw={700} gradient={{ from: 'blue', to: 'cyan' }}>
                Zipline
              </Text>
            </Group>

            {/* Navigation */}
            <Group gap='md'>
              <Button
                variant='light'
                leftSection={<IconBrandGithub size='1rem' />}
                component='a'
                href='https://github.com/diced/zipline'
                target='_blank'
                radius='md'
              >
                GitHub
              </Button>
              <Button
                variant='light'
                leftSection={<IconBrandDiscord size='1rem' />}
                component='a'
                href='#'
                target='_blank'
                radius='md'
              >
                Discord
              </Button>

              {isAuthenticated ? (
                <>
                  <Button
                    variant='light'
                    leftSection={<IconDashboard size='1rem' />}
                    onClick={() => router.push('/dashboard')}
                    radius='md'
                  >
                    Dashboard
                  </Button>
                  <Menu>
                    <Menu.Target>
                      <ActionIcon
                        variant='light'
                        size='lg'
                        radius='xl'
                        style={{
                          backgroundColor: 'rgba(255, 255, 255, 0.1)',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                        }}
                      >
                        {avatar ? (
                          <Avatar src={avatar} alt={user?.username} size='lg' radius='md' />
                        ) : (
                          <Avatar color='blue' radius='md' size='lg'>
                            {user?.username?.charAt(0)?.toUpperCase() || 'U'}
                          </Avatar>
                        )}
                      </ActionIcon>
                    </Menu.Target>
                    <Menu.Dropdown>
                      <Menu.Label>Account</Menu.Label>
                      <Menu.Item
                        leftSection={<IconDashboard size='1rem' />}
                        onClick={() => router.push('/dashboard')}
                      >
                        Dashboard
                      </Menu.Item>
                      <Menu.Item
                        leftSection={<IconSettings size='1rem' />}
                        onClick={() => router.push('/dashboard/settings')}
                      >
                        Settings
                      </Menu.Item>
                      <Menu.Divider />
                      <Menu.Item
                        color='red'
                        leftSection={<IconX size='1rem' />}
                        onClick={() => {
                          router.push('/auth/logout');
                        }}
                      >
                        Logout
                      </Menu.Item>
                    </Menu.Dropdown>
                  </Menu>
                </>
              ) : (
                <Button variant='filled' onClick={() => router.push('/auth/login')} radius='md'>
                  Login
                </Button>
              )}
            </Group>
          </Group>
        </Container>
      </Paper>

      {/* Main Content */}
      <Box style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Container size='md' py='lg'>
          <Stack gap='lg' maw={800}>


            {/* Upload Actions */}
            <Paper
              p='md'
              radius='lg'
              style={{
                backgroundColor: 'rgba(0, 0, 0, 0.6)',
                backdropFilter: 'blur(20px)',
                border: 'none',
              }}
            >
              <Group justify='center' gap='sm'>
                <Button
                  variant='light'
                  leftSection={<IconFiles size='0.8rem' />}
                  onClick={() => {
                    if (isUploadingRef.current || uploadInProgress || uploading) {
                      notifications.show({
                        title: 'Upload in progress',
                        message: 'Please wait for the current upload to complete',
                        color: 'yellow',
                        icon: <IconUpload size='1rem' />,
                        autoClose: 3000,
                      });
                      return;
                    }
                    
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.multiple = true;
                    input.onchange = (e) => {
                      const target = e.target as HTMLInputElement;
                      if (target.files && target.files.length > 0) {
                        handleFilesAdded(Array.from(target.files));
                      }
                    };
                    input.click();
                  }}
                  radius='md'
                  size='md'
                  disabled={uploadInProgress || uploading || isUploadingRef.current}
                >
                  Select Files
                </Button>
                                <Button
                  variant='light'
                  leftSection={<IconFolder size='0.8rem' />}
                  onClick={() => {
                    if (uploadInProgress) {
                      notifications.show({
                        title: 'Upload in progress',
                        message: 'Please wait for the current upload to complete',
                        color: 'yellow',
                        icon: <IconUpload size='1rem' />,
                      });
                      return;
                    }
                    
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.webkitdirectory = true;
                    input.multiple = true;
                    input.onchange = (e) => {
                      const target = e.target as HTMLInputElement;
                      if (target.files) {
                        const fileArray = Array.from(target.files);
                        if (fileArray.length > 0) {
                          // Group files by directory
                          const folderMap = new Map<string, File[]>();
                          fileArray.forEach((file) => {
                            const pathParts = file.webkitRelativePath.split('/');
                            const folderName = pathParts[0];
                            if (!folderMap.has(folderName)) {
                              folderMap.set(folderName, []);
                            }
                            folderMap.get(folderName)!.push(file);
                          });

                          // Convert to folder structure
                          const newFolders = Array.from(folderMap.entries()).map(([name, files]) => ({
                            name,
                            files,
                          }));

                          setFolders((prev) => [...prev, ...newFolders]);
                          notifications.show({
                            title: 'Folder uploaded',
                            message: `Added ${newFolders.length} folder(s) with ${fileArray.length} files`,
                            color: 'green',
                          });
                          
                          // Auto-upload folder contents immediately
                          setTimeout(() => {
                            console.log('📁 Folder upload timeout triggered for:', fileArray.length, 'files');
                            
                            // Prevent multiple simultaneous uploads
                            if (uploadInProgress) {
                              console.log('⚠️ Folder upload: Upload already in progress, skipping this call');
                              return;
                            }
                            
                            if (fileArray.length > 0) {
                              // Check if upload is allowed
                              if (!isAuthenticated && !publicUploadEnabled) {
                                notifications.show({
                                  title: 'Upload not allowed',
                                  message: 'Please log in to upload files or contact admin to enable public uploads',
                                  color: 'red',
                                });
                                return;
                              }
                              
                              // Set upload in progress flag
                              setUploadInProgress(true);
                              
                              // Start upload immediately
                              setUploading(true);
                              notifications.show({
                                title: 'Auto-upload started',
                                message: `Uploading ${fileArray.length} file${fileArray.length !== 1 ? 's' : ''} from folder automatically`,
                                color: 'blue',
                                icon: <IconUpload size='1rem' />,
                                autoClose: false,
                                withCloseButton: true,
                              });
                              
                              // Use the same custom upload function - only upload the new folder files
                              console.log('🚀 Folder: Calling customUploadFiles with:', fileArray.length, 'files');
                              customUploadFiles(fileArray);
                            }
                          }, 100);
                        }
                      }
                    };
                    input.click();
                  }}
                  radius='md'
                  size='md'
                  disabled={uploadInProgress || uploading || isUploadingRef.current}
                >
                  Select Folder
                </Button>
                <Button
                  variant='light'
                  leftSection={<IconDownload size='0.8rem' />}
                  onClick={openUrlDownload}
                  radius='md'
                  size='md'
                >
                  Download from URL
                </Button>
                <Button
                  variant='light'
                  leftSection={<IconClipboard size='0.8rem' />}
                  onClick={() => {
                    notifications.show({
                      title: 'Paste ready',
                      message: 'Copy an image and press Ctrl+V to paste it here',
                      color: 'blue',
                    });
                  }}
                  radius='md'
                  size='md'
                >
                  Paste from Clipboard
                </Button>
              </Group>
            </Paper>

            {/* Dropzone */}
            <Paper
              p='lg'
              radius='lg'
              style={{
                backgroundColor: 'rgba(0, 0, 0, 0.4)',
                backdropFilter: 'blur(20px)',
                border: 'none',
                transition: 'all 0.3s ease',
              }}
            >
              <Dropzone
                onDrop={(files) => {
                  if (isUploadingRef.current || uploadInProgress || uploading) {
                    notifications.show({
                      title: 'Upload in progress',
                      message: 'Please wait for the current upload to complete',
                      color: 'yellow',
                      icon: <IconUpload size='1rem' />,
                      autoClose: 3000,
                    });
                    return;
                  }
                  handleFilesAdded(files);
                }}
                loading={uploading || uploadInProgress}
                maxFiles={100}
                maxSize={bytes(config.files.maxFileSize)}
                disabled={uploadInProgress || uploading || isUploadingRef.current}
                style={{
                  border: 'none',
                  backgroundColor: 'transparent',
                  minHeight: '200px',
                }}
              >
                               <Center>
                 <Stack align='center' gap='md'>
                   <ThemeIcon
                     size={60}
                     radius='xl'
                     variant='gradient'
                     gradient={{ from: 'blue', to: 'cyan' }}
                   >
                     <IconDragDrop size='2.5rem' />
                   </ThemeIcon>
                   <div style={{ textAlign: 'center' }}>
                     <Title order={3} size='h4' fw={600} mb='xs'>
                       Drop files here or click to select
                     </Title>
                     <Text size='sm' c='dimmed' mb='sm'>
                       Supports files, folders, images from clipboard, and URL downloads
                     </Text>
                     <Text size='xs' c='dimmed'>
                       Max file size: {bytes(config.files.maxFileSize)}
                     </Text>
                   </div>
                 </Stack>
               </Center>
              </Dropzone>
            </Paper>

            {/* File List */}
            {getAllFiles().length > 0 && (
              <Paper
                p='lg'
                radius='lg'
                style={{
                  backgroundColor: 'rgba(0, 0, 0, 0.6)',
                  backdropFilter: 'blur(20px)',
                  border: 'none',
                }}
              >
                <Stack gap='lg'>
                  <Group justify='space-between'>
                    <Title order={3}>
                      {uploading ? '🔄 ' : ''}Files Uploading Automatically (
                      <span style={{ 
                        color: uploading ? '#74b9ff' : 'inherit',
                        transition: 'color 0.3s ease'
                      }}>
                        {getAllFiles().length} files
                      </span>
                      )
                    </Title>
                    <Group>
                                           <Button
                       variant='light'
                       color='red'
                       leftSection={<IconTrashFilled size='0.8rem' />}
                       onClick={handleClearAll}
                       radius='md'
                       size='md'
                     >
                       Clear All
                     </Button>
                                           <Button
                       variant='light'
                       color='blue'
                       leftSection={<IconUpload size='0.8rem' />}
                       disabled
                       size='md'
                       radius='md'
                       style={{
                         opacity: 0.6,
                         cursor: 'not-allowed',
                         border: '1px dashed rgba(255, 255, 255, 0.3)',
                       }}
                       title="Files upload automatically when selected - no manual upload needed"
                     >
                       🚀 Auto-Upload Active
                     </Button>
                    </Group>
                  </Group>

                  <Stack gap='sm'>
                    {/* Individual Files */}
                    {files.map((file, index) => (
                                           <Card
                       key={`file-${index}`}
                       p='md'
                       radius='md'
                       className='file-added'
                       data-file-index={index}
                       style={{
                         backgroundColor: 'rgba(255, 255, 255, 0.1)',
                         border: 'none',
                       }}
                     >
                        <Group justify='space-between'>
                          <Group>
                            <ThemeIcon variant='light' color='blue'>
                              <IconFiles size='1rem' />
                            </ThemeIcon>
                            <div>
                              <Text fw={500}>{file.name}</Text>
                              <Text size='sm' c='dimmed'>
                                {bytes(file.size)} • {file.type || 'Unknown'}
                              </Text>
                            </div>
                          </Group>
                          <ActionIcon variant='light' color='red' onClick={() => handleFileRemove(index)}>
                            <IconX size='1rem' />
                          </ActionIcon>
                        </Group>
                      </Card>
                    ))}

                                         {/* Folders */}
                     {folders.map((folder, folderIndex) => (
                       <Card
                         key={`folder-${folderIndex}`}
                         p='md'
                         radius='md'
                         className='file-added'
                         style={{
                           backgroundColor: 'rgba(255, 255, 255, 0.15)',
                           border: 'none',
                         }}
                       >
                        <Stack gap='sm'>
                          <Group justify='space-between'>
                            <Group>
                              <ThemeIcon variant='light' color='green'>
                                <IconFolder size='1rem' />
                              </ThemeIcon>
                              <div>
                                <Text fw={500}>{folder.name}</Text>
                                <Text size='sm' c='dimmed'>
                                  {folder.files.length} file{folder.files.length !== 1 ? 's' : ''} •{' '}
                                  {bytes(folder.files.reduce((acc, file) => acc + file.size, 0))}
                                </Text>
                              </div>
                            </Group>
                            <ActionIcon
                              variant='light'
                              color='red'
                              onClick={() => {
                                setFolders((prev) => prev.filter((_, i) => i !== folderIndex));
                              }}
                            >
                              <IconX size='1rem' />
                            </ActionIcon>
                          </Group>

                          {/* Files within folder */}
                          <Stack gap='xs' ml='md'>
                            {folder.files.map((file, fileIndex) => (
                                                             <Card
                                 key={`folder-${folderIndex}-file-${fileIndex}`}
                                 p='sm'
                                 radius='sm'
                                 style={{
                                   backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                   border: 'none',
                                 }}
                               >
                                <Group justify='space-between'>
                                  <Group>
                                    <ThemeIcon variant='light' color='blue' size='sm'>
                                      <IconFiles size='0.8rem' />
                                    </ThemeIcon>
                                    <div>
                                      <Text size='sm' fw={500}>
                                        {file.name}
                                      </Text>
                                      <Text size='xs' c='dimmed'>
                                        {bytes(file.size)} • {file.type || 'Unknown'}
                                      </Text>
                                    </div>
                                  </Group>
                                  <ActionIcon
                                    variant='light'
                                    color='red'
                                    size='sm'
                                    onClick={() => {
                                      setFolders((prev) =>
                                        prev.map((f, i) =>
                                          i === folderIndex
                                            ? { ...f, files: f.files.filter((_, fi) => fi !== fileIndex) }
                                            : f,
                                        ),
                                      );
                                    }}
                                  >
                                    <IconX size='0.8rem' />
                                  </ActionIcon>
                                </Group>
                              </Card>
                            ))}
                          </Stack>
                        </Stack>
                      </Card>
                    ))}
                  </Stack>
                </Stack>
              </Paper>
            )}

            {/* Upload Progress */}
            <Paper
              p='lg'
              radius='lg'
              style={{
                backgroundColor: 'rgba(0, 0, 0, 0.6)',
                backdropFilter: 'blur(20px)',
                border: 'none',
                opacity: uploading ? 1 : 0,
                transform: uploading ? 'translateY(0)' : 'translateY(-20px)',
                transition: 'all 0.3s ease',
                display: uploading ? 'block' : 'none',
              }}
            >
                <Stack gap='lg'>
                  <Group justify='space-between'>
                    <Title order={3} style={{ animation: 'fadeIn 0.5s ease-out' }}>
                      Upload Progress
                    </Title>
                    <RingProgress
                      size={60}
                      thickness={4}
                      sections={[{ value: progress.percent, color: 'blue' }]}
                      label={
                        <Text ta='center' size='xs' fw={700}>
                          {progress.percent}%
                        </Text>
                      }
                      style={{ animation: 'scaleIn 0.4s ease-out' }}
                    />
                  </Group>

                  <Progress 
                    value={progress.percent} 
                    size='xl' 
                    radius='md' 
                    color='blue' 
                    striped 
                    animated
                    style={{ 
                      animation: 'slideInLeft 0.5s ease-out',
                      transition: 'all 0.3s ease'
                    }}
                  />

                  <Group justify='space-between'>
                    <Group gap='md'>
                      <Badge 
                        variant='light' 
                        color='blue'
                        style={{ animation: 'fadeIn 0.6s ease-out' }}
                      >
                        Speed: {bytes(progress.speed)}/s
                      </Badge>
                      {progress.remaining > 0 && (
                        <Badge 
                          variant='light' 
                          color='green'
                          style={{ animation: 'fadeIn 0.7s ease-out' }}
                        >
                          Remaining: {humanizeDuration(progress.remaining * 1000)}
                        </Badge>
                      )}
                    </Group>
                    <Text 
                      size='lg' 
                      fw={600} 
                      c='blue'
                      style={{ animation: 'fadeIn 0.8s ease-out' }}
                    >
                      {progress.percent}% Complete
                    </Text>
                  </Group>
                </Stack>
              </Paper>

            {/* Uploaded Files Results */}
            {uploadedFiles.length > 0 && (
              <Paper
                p='lg'
                radius='lg'
                style={{
                  backgroundColor: 'rgba(0, 0, 0, 0.6)',
                  backdropFilter: 'blur(20px)',
                  border: 'none',
                }}
              >
                <Stack gap='lg'>
                  <Group justify='space-between'>
                    <Title order={3} c='green'>
                      <IconCheck size='1.5rem' style={{ marginRight: '8px' }} />
                      Upload Complete!
                    </Title>
                    <Menu>
                      <Menu.Target>
                        <Button variant='light' leftSection={<IconCopy size='1rem' />}>
                          Copy Options
                        </Button>
                      </Menu.Target>
                      <Menu.Dropdown>
                        <Menu.Item
                          leftSection={<IconLink size='1rem' />}
                          onClick={() => copyAsLink(uploadedFiles.map((f) => f.url))}
                        >
                          Copy as Links
                        </Menu.Item>
                        <Menu.Item
                          leftSection={<IconMarkdown size='1rem' />}
                          onClick={() => copyAsMarkdown(uploadedFiles)}
                        >
                          Copy as Markdown
                        </Menu.Item>
                        <Menu.Item
                          leftSection={<IconCode size='1rem' />}
                          onClick={() => copyAsEmbed(uploadedFiles)}
                        >
                          Copy as HTML
                        </Menu.Item>
                      </Menu.Dropdown>
                    </Menu>
                  </Group>

                  <Stack gap='sm'>
                    {uploadedFiles.map((file, index) => (
                                           <Card
                       key={`uploaded-${index}`}
                       p='md'
                       radius='md'
                       style={{
                         backgroundColor: 'rgba(34, 197, 94, 0.1)',
                         border: 'none',
                       }}
                     >
                        <Group justify='space-between'>
                          <Group>
                            <ThemeIcon variant='light' color='green'>
                              <IconCheck size='1rem' />
                            </ThemeIcon>
                            <div>
                              <Text fw={500}>{file.name}</Text>
                              <Text size='sm' c='dimmed' component='a' href={file.url} target='_blank'>
                                {file.url}
                              </Text>
                            </div>
                          </Group>
                          <Button
                            variant='light'
                            size='sm'
                            leftSection={<IconCopy size='0.8rem' />}
                            onClick={() => {
                              clipboard.copy(file.url);
                              notifications.show({
                                title: 'Copied!',
                                message: 'File URL copied to clipboard',
                                color: 'green',
                              });
                            }}
                          >
                            Copy
                          </Button>
                        </Group>
                      </Card>
                    ))}
                  </Stack>
                </Stack>
              </Paper>
            )}
          </Stack>
        </Container>
      </Box>

      {/* Footer */}
      <Paper
        radius={0}
        p='lg'
        mt='lg'
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.15)',
          backdropFilter: 'blur(20px)',
          borderTop: '1px solid rgba(255, 255, 255, 0.2)',
        }}
      >
        <Container size='xl'>
          <Group justify='space-between' align='center'>
            <Text c='dimmed'>© 2024 Zipline. Made with ❤️ for file sharing.</Text>
            <Group gap='xl'>
              <Group gap='xs'>
                <IconDatabase size='1rem' color='var(--mantine-color-blue-4)' />
                <Text size='sm' c='dimmed'>
                  {metrics.totalStorage} stored
                </Text>
              </Group>
              <Group gap='xs'>
                <IconFiles size='1rem' color='var(--mantine-color-green-4)' />
                <Text size='sm' c='dimmed'>
                  {metrics.totalFiles} files
                </Text>
              </Group>
              <Group gap='xs'>
                <IconUsers size='1rem' color='var(--mantine-color-violet-4)' />
                <Text size='sm' c='dimmed'>
                  {metrics.totalUsers} users
                </Text>
              </Group>
              <Group gap='xs'>
                <IconClock size='1rem' color='var(--mantine-color-orange-4)' />
                <Text size='sm' c='dimmed'>
                  {metrics.uptime} uptime
                </Text>
              </Group>
            </Group>
          </Group>
        </Container>
      </Paper>

      {/* URL Download Modal */}
      <Modal opened={urlDownloadOpened} onClose={closeUrlDownload} title='Download from URL' radius='md'>
        <Stack gap='md'>
          <TextInput
            placeholder='Enter file URL...'
            value={downloadUrl}
            onChange={(e) => setDownloadUrl(e.target.value)}
            leftSection={<IconLink size='1rem' />}
            radius='md'
          />
          <Group justify='flex-end'>
            <Button variant='light' onClick={closeUrlDownload} radius='md'>
              Cancel
            </Button>
            <Button onClick={handleUrlDownload} loading={downloadingFromUrl} radius='md'>
              Download
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Box>
  );
}

export const getServerSideProps = withSafeConfig();

StandaloneUpload.title = 'Upload';
