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
import { UploadProgress } from '../../components/upload/UploadProgress';
import { BatchSizeSettings } from '../../components/upload/BatchSizeSettings';
import { useFileUpload } from '../../hooks/useFileUpload';
import { useBatchUpload } from '../../hooks/useBatchUpload';
import { UploadHeader } from './components/UploadHeader';
import { UploadActions } from './components/UploadActions';
import { UploadDropzone } from './components/UploadDropzone';
import { UploadBackground } from './components/UploadBackground';
import { UrlDownloadModal } from './components/UrlDownloadModal';
import '@/styles/upload-animations.css';

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
  const [fileProgress, setFileProgress] = useState<{ [key: string]: number }>({});
  const [fileUploadSpeed, setFileUploadSpeed] = useState<{ [key: string]: number }>({});
  const [batchSize, setBatchSize] = useState(5); // Default batch size
  const [uploadQueue, setUploadQueue] = useState<File[]>([]); // Queue of all files to upload
  const [currentBatchIndex, setCurrentBatchIndex] = useState(0); // Current batch being processed
  const [urlDownloadOpened, { open: openUrlDownload, close: closeUrlDownload }] = useDisclosure(false);
  const [downloadUrl, setDownloadUrl] = useState('');
  const [downloadingFromUrl, setDownloadingFromUrl] = useState(false);
  const [uploadInProgress, setUploadInProgress] = useState(false);
  const uploadRef = useRef<{ [key: string]: boolean }>({});
  const isUploadingRef = useRef(false);

  // Central lock: true while any upload is in progress
  const isLocked = uploadInProgress || uploading || isUploadingRef.current;

  // Notification suppression helper: suppress when queue size is large
  const shouldSuppressNotifications = (countOverride?: number) => {
    const count = typeof countOverride === 'number' ? countOverride : uploadQueue.length;
    return count > 3;
  };

  // Simple metrics for now
  const metrics = {
    totalStorage: '0 B',
    totalFiles: 0,
    uptime: '0 minutes',
    totalUsers: 0,
  };

  // Monitor queue progress and show notification when complete
  useEffect(() => {
    if (uploadQueue.length > 1 && !uploading) {
      const totalSize = uploadQueue.reduce((sum, file) => sum + file.size, 0);
      const uploadedSize = uploadQueue.reduce((sum, file) => {
        const progress = fileProgress[file.name] || 0;
        return sum + (file.size * (progress / 100));
      }, 0);
      const overallProgress = totalSize > 0 ? (uploadedSize / totalSize) * 100 : 0;
      
      if (Math.round(overallProgress) >= 100 && uploadedSize > 0) {
        notifications.show({
          title: 'All uploads complete!',
          message: `Successfully uploaded ${uploadQueue.length} file${uploadQueue.length !== 1 ? 's' : ''}`,
          color: 'green',
          icon: <IconFileUpload size='1rem' />,
          autoClose: 4000,
        });
      }
    }
  }, [fileProgress, uploadQueue, uploading]);

  // Clipboard paste handler
  const handleClipboardPaste = (e: ClipboardEvent) => {
    // Prevent adding files while uploading
    if (isUploadingRef.current || uploadInProgress || uploading) {
      notifications.show({
        title: 'Upload in progress',
        message: 'Please wait for the current upload to complete before pasting files',
        color: 'yellow',
        icon: <IconUpload size='1rem' />,
        autoClose: 3000,
      });
      return;
    }
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
      // Clipboard paste notifications removed for cleaner UX
    }
  };

  // Custom upload function that captures response and auto-copies links
  // suppressIntermediateNotifications: when true, skip non-final notifications
  const customUploadFiles = async (files: File[], isBatchMode = false, suppressIntermediateNotifications = false) => {
    // Initialize or reset progress for current batch files
    setFileProgress((prev) => {
      const updated = { ...prev };
      files.forEach((file) => {
        updated[file.name] = 0; // Reset to 0 for fresh start
      });
      return updated;
    });
    
    // Initialize or reset speed for current batch files
    setFileUploadSpeed((prev) => {
      const updated = { ...prev };
      files.forEach((file) => {
        updated[file.name] = 0; // Reset to 0 for fresh start
      });
      return updated;
    });

    const body = new FormData();
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    for (let i = 0; i !== files.length; ++i) {
      body.append('file', files[i]);
    }

    const headers: Record<string, string> = {};
    options.deletesAt !== 'never' && (headers['x-zipline-deletes-at'] = options.deletesAt);
    options.format !== 'default' && (headers['x-zipline-format'] = options.format);
    options.imageCompressionPercent &&
      (headers['x-zipline-image-compression-percent'] = options.imageCompressionPercent.toString());
    options.maxViews && (headers['x-zipline-max-views'] = options.maxViews.toString());
    options.addOriginalName && (headers['x-zipline-original-name'] = 'true');
    options.overrides_returnDomain && (headers['x-zipline-domain'] = options.overrides_returnDomain);
    ephemeral.password && (headers['x-zipline-password'] = ephemeral.password);
    ephemeral.filename && (headers['x-zipline-filename'] = encodeURIComponent(ephemeral.filename));
    if (ephemeral.folderId) {
      headers['x-zipline-folder'] = ephemeral.folderId;
    }

    // Use XMLHttpRequest for real upload progress tracking
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      let lastLoaded = 0;
      let lastTime = Date.now();
      let speedValues: number[] = []; // Store last few speed values for smoothing

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const currentTime = Date.now();
          const timeDiff = (currentTime - lastTime) / 1000; // seconds
          const loadedDiff = e.loaded - lastLoaded;
          
          // Calculate speed in bytes per second (only if enough time has passed)
          if (timeDiff >= 0.1 && loadedDiff > 0) {
            const instantSpeed = loadedDiff / timeDiff;
            speedValues.push(instantSpeed);
            
            // Keep only last 5 speed values for smoothing
            if (speedValues.length > 5) {
              speedValues.shift();
            }
            
            // Calculate average speed for smoother display
            const avgSpeed = speedValues.reduce((sum, s) => sum + s, 0) / speedValues.length;
            
            // Update speed for all files in this batch
            setFileUploadSpeed((prev) => {
              const updated = { ...prev };
              files.forEach((file) => {
                updated[file.name] = avgSpeed;
              });
              return updated;
            });
            
            lastLoaded = e.loaded;
            lastTime = currentTime;
            
            // Also update progress at the same frequency (0.1s)
            const overallPercent = (e.loaded / e.total) * 100;
            setFileProgress((prev) => {
              const updated = { ...prev };
              files.forEach((file) => {
                updated[file.name] = Math.min(100, overallPercent);
              });
              return updated;
            });
          } else if (timeDiff >= 0.1) {
            // Update progress even if no speed calculation (for very slow uploads)
            const overallPercent = (e.loaded / e.total) * 100;
            setFileProgress((prev) => {
              const updated = { ...prev };
              files.forEach((file) => {
                updated[file.name] = Math.min(100, overallPercent);
              });
              return updated;
            });
            lastTime = currentTime;
          }
        }
      });

      xhr.addEventListener('load', async () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          const result = JSON.parse(xhr.responseText);

          // Set only the current batch files to 100% progress
          setFileProgress((prev) => {
            const completed = { ...prev };
            files.forEach((file) => {
              completed[file.name] = 100;
            });
            return completed;
          });

          // DON'T clear speed for completed files during batch uploads
          // Speed should persist to show total upload speed across all batches
          // Only clear speeds when ALL uploads are completely finished

          // Update uploaded files state with the response
          if (result.files && Array.isArray(result.files)) {
            setUploadedFiles((prev) => [...prev, ...result.files]);

            // Auto-copy links to clipboard only for single file uploads
            const urls = result.files.map((f: any) => f.url);
            if (urls.length === 1 && !isBatchMode) {
              try {
                navigator.clipboard.writeText(urls[0]);
              } catch (err) {
                // Fallback for older browsers
                const textArea = document.createElement('textarea');
                textArea.value = urls[0];
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
              }
            }
          }

          // Clear file list but keep progress display
          setFiles([]);
          setFolders([]);

          // Upload completion notifications removed for cleaner UX

          // Only reset uploading state if not in batch mode
          if (!isBatchMode) {
            setUploading(false);
            setUploadInProgress(false);
            isUploadingRef.current = false;
          }
          setProgress({ percent: 0, remaining: 0, speed: 0 });
          // Keep upload speeds to show connection performance
          clearEphemeral();
          
          resolve(result);
        } else {
          // Only reset uploading state if not in batch mode
          if (!isBatchMode) {
            setUploading(false);
            setUploadInProgress(false);
            isUploadingRef.current = false;
          }
          setProgress({ percent: 0, remaining: 0, speed: 0 });
          // Keep upload speeds to show last connection performance
          clearEphemeral();
          
          notifications.show({
            title: 'Upload failed',
            message: `Server returned status ${xhr.status}`,
            color: 'red',
            icon: <IconFileXFilled size='1rem' />,
            autoClose: 5000,
          });
          reject(new Error('Upload failed'));
        }
      });

      xhr.addEventListener('error', () => {
          // Only reset uploading state if not in batch mode
          if (!isBatchMode) {
            setUploading(false);
            setUploadInProgress(false);
            isUploadingRef.current = false;
          }
          setProgress({ percent: 0, remaining: 0, speed: 0 });
        // Keep upload speeds to show last connection performance
        clearEphemeral();
        
        notifications.show({
          title: 'Upload failed',
          message: 'Network error occurred during upload',
          color: 'red',
          icon: <IconFileXFilled size='1rem' />,
          autoClose: 5000,
        });
        reject(new Error('Network error'));
      });

      xhr.addEventListener('abort', () => {
          // Only reset uploading state if not in batch mode
          if (!isBatchMode) {
            setUploading(false);
            setUploadInProgress(false);
            isUploadingRef.current = false;
          }
          setProgress({ percent: 0, remaining: 0, speed: 0 });
        // Keep upload speeds to show last connection performance
        clearEphemeral();
        
        notifications.show({
          title: 'Upload cancelled',
          message: 'Upload was cancelled',
          color: 'orange',
          icon: <IconFileXFilled size='1rem' />,
          autoClose: 5000,
        });
        reject(new Error('Upload cancelled'));
      });

      xhr.open('POST', '/api/upload');
      
      // Set headers
      Object.entries(headers).forEach(([key, value]) => {
        xhr.setRequestHeader(key, value);
      });

      xhr.send(body);
    });
  };

  // Batch upload function - uploads files in batches
  const uploadFilesInBatches = async (allFiles: File[]) => {
    if (allFiles.length === 0) return;

    // Set the upload queue
    setUploadQueue(allFiles);
    setCurrentBatchIndex(0);

    // Initialize progress for all files
    const initialProgress: { [key: string]: number } = {};
    const initialSpeed: { [key: string]: number } = {};
    allFiles.forEach((file) => {
      initialProgress[file.name] = 0;
      initialSpeed[file.name] = 0;
    });
    setFileProgress(initialProgress);
    setFileUploadSpeed(initialSpeed);

    const totalFiles = allFiles.length;
    const batches = [];
    
    // Split files into batches
    for (let i = 0; i < allFiles.length; i += batchSize) {
      batches.push(allFiles.slice(i, i + batchSize));
    }

    const suppressIntermediateNotifications = shouldSuppressNotifications(totalFiles);
    // Upload start notifications removed for cleaner UX

    // Upload batches sequentially
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      setCurrentBatchIndex(i);
      
      try {
        await customUploadFiles(batch, true, suppressIntermediateNotifications); // batch mode + suppression
        
        // DON'T reorder queue - keep files in original positions
        // This prevents index mismatch bugs in the UI
        
        // Batch progress notifications removed for cleaner UX
      } catch (error) {
        notifications.show({
          title: 'Batch upload failed',
          message: `Failed to upload batch ${i + 1}/${batches.length}`,
          color: 'red',
          icon: <IconFileXFilled size='1rem' />,
          autoClose: 5000,
        });
        // Continue with next batch even if one fails
      }
    }
    
    // Reset uploading state after all batches are complete
    setUploading(false);
    setUploadInProgress(false);
    isUploadingRef.current = false;
    
    // Keep upload speeds after completion to show connection speed
    // Don't clear speeds - they represent connection performance
    
    // Notification will be triggered by useEffect when progress reaches 100%
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

    // Use batch upload if there are more than batchSize files
    if (filesToUpload.length > batchSize) {
      uploadFilesInBatches(filesToUpload);
    } else {
      // For small uploads, also set queue for consistent UI
      setUploadQueue(filesToUpload);
      setCurrentBatchIndex(0);
      
      // Auto-upload start notifications removed for cleaner UX
      const suppressIntermediateNotifications = shouldSuppressNotifications(filesToUpload.length);
      customUploadFiles(filesToUpload, false, suppressIntermediateNotifications);
    }
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
        // URL download success notifications removed for cleaner UX

        // handleFilesAdded now handles auto-upload automatically
      } else {
        throw new Error('Failed to download');
      }
    } catch (error) {
      // URL download error notifications removed for cleaner UX
    }
    setDownloadingFromUrl(false);
  };

  // Upload handler - no longer needed since auto-upload is enabled
  // const handleUpload = () => { ... };

  useEffect(() => {
    document.addEventListener('paste', handleClipboardPaste);
    window.addEventListener('beforeunload', clearEphemeral);

    return () => {
      document.removeEventListener('paste', handleClipboardPaste);
      window.removeEventListener('beforeunload', clearEphemeral);
    };
  }, []);

  // Background style - only show custom background if user is logged in
  const backgroundStyle =
    isAuthenticated && backgroundType === 'image' && backgroundImageUrl && backgroundImageUrl.trim() !== ''
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
      </Head>

      {/* Background */}
      <UploadBackground
        backgroundStyle={backgroundStyle}
        isAuthenticated={isAuthenticated}
        backgroundType={backgroundType}
        backgroundImageUrl={backgroundImageUrl}
      />

      {/* Header */}
      <UploadHeader
        isAuthenticated={isAuthenticated}
        avatar={avatar}
        username={user?.username}
      />

      {/* Main Content */}
      <Box style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
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
                    if (isLocked) {
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
                  disabled={isLocked}
                >
                  Select Files
                </Button>
                <Button
                  variant='light'
                  leftSection={<IconFolder size='0.8rem' />}
                  onClick={() => {
                    if (isLocked) {
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
                          // Folder upload notifications removed for cleaner UX

                          // Use the same file-added path for auto-upload & queueing
                          setTimeout(() => {
                            console.log('📁 Folder: delegating to handleFilesAdded with', fileArray.length, 'files');
                            if (isLocked) {
                              notifications.show({
                                title: 'Upload in progress',
                                message: 'Please wait for the current upload to complete',
                                color: 'yellow',
                                icon: <IconUpload size='1rem' />,
                                autoClose: 3000,
                              });
                              return;
                            }
                            if (!isAuthenticated && !publicUploadEnabled) {
                              notifications.show({
                                title: 'Upload not allowed',
                                message: 'Please log in to upload files or contact admin to enable public uploads',
                                color: 'red',
                                autoClose: 5000,
                              });
                              return;
                            }
                            if (fileArray.length > 0) {
                              handleFilesAdded(fileArray);
                            }
                          }, 100);
                        }
                      }
                    };
                    input.click();
                  }}
                  radius='md'
                  size='md'
                  disabled={isLocked}
                >
                  Select Folder
                </Button>
                <Button
                  variant='light'
                  leftSection={<IconDownload size='0.8rem' />}
                  onClick={openUrlDownload}
                  radius='md'
                  size='md'
                  disabled={isLocked}
                >
                  Download from URL
                </Button>
                <Button
                  variant='light'
                  leftSection={<IconClipboard size='0.8rem' />}
                  onClick={() => {
                    if (isLocked) {
                      notifications.show({
                        title: 'Upload in progress',
                        message: 'Please wait for the current upload to complete',
                        color: 'yellow',
                        icon: <IconUpload size='1rem' />,
                        autoClose: 3000,
                      });
                      return;
                    }
                    // Paste ready notifications removed for cleaner UX
                  }}
                  radius='md'
                  size='md'
                  disabled={isLocked}
                >
                  Paste from Clipboard
                </Button>
              </Group>
              
              {/* Batch Size Settings */}
              <Box
                mt='md'
                pt='md'
                style={{
                  borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                  opacity: isLocked ? 0.6 : 1,
                  pointerEvents: isLocked ? 'none' as const : 'auto',
                }}
              >
                <Group justify='space-between' align='center'>
                  <Group gap='xs'>
                    <Text size='sm' c='dimmed'>Batch Upload Size:</Text>
                    <Text size='sm' fw={600}>{batchSize} files per batch</Text>
                  </Group>
                  <Group gap='xs'>
                    <Button
                      variant='subtle'
                      size='xs'
                      onClick={() => setBatchSize(Math.max(1, batchSize - 1))}
                      disabled={isLocked || batchSize <= 1}
                    >
                      -
                    </Button>
                    <Button
                      variant='subtle'
                      size='xs'
                      onClick={() => setBatchSize(Math.min(50, batchSize + 1))}
                      disabled={isLocked || batchSize >= 50}
                    >
                      +
                    </Button>
                    <Button
                      variant='subtle'
                      size='xs'
                      onClick={() => setBatchSize(5)}
                      disabled={isLocked}
                    >
                      Reset
                    </Button>
                  </Group>
                </Group>
                <Text size='xs' c='dimmed' mt='xs'>
                  When uploading many files, they will be processed in batches of {batchSize}. Adjust between 1-50 files per batch.
                </Text>
              </Box>
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
                minHeight: (uploading || Object.keys(fileProgress).length > 0) ? '400px' : '200px',
              }}
            >
              {!uploading && Object.keys(fileProgress).length === 0 ? (
                <Dropzone
                  onDrop={(files) => {
                    handleFilesAdded(files);
                  }}
                  maxFiles={100}
                  maxSize={bytes(config.files.maxFileSize)}
                  style={{
                    border: 'none',
                    backgroundColor: 'transparent',
                    minHeight: '200px',
                  }}
                >
                  <Center style={{ cursor: 'pointer', padding: '40px 20px' }}>
                    <Stack align='center' gap='md'>
                      <ThemeIcon
                        size={80}
                        radius='xl'
                        variant='gradient'
                        gradient={{ from: 'gray', to: 'dark' }}
                      >
                        <IconCloudUpload size='3rem' />
                      </ThemeIcon>
                      <Title order={2} fw={700} style={{ color: '#74b9ff' }}>
                        Upload Something
                      </Title>
                      <Text size='sm' c='dimmed'>
                        Drop files here or click to select
                      </Text>
                    </Stack>
                  </Center>
                </Dropzone>
              ) : (
                <Box p='lg' style={{ cursor: 'default' }}>
                  <Stack gap='lg'>
                    {/* Total Progress Bar */}
                    {uploadQueue.length > 0 && (
                      <Stack gap='xs'>
                        <Group justify='space-between' align='center'>
                          <Text size='sm' fw={600} c='gray'>
                            Total Progress
                          </Text>
                          <Text size='sm' fw={600} c='gray'>
                            {(() => {
                              const totalSize = uploadQueue.reduce((sum, file) => sum + file.size, 0);
                              const uploadedSize = uploadQueue.reduce((sum, file) => {
                                const progress = fileProgress[file.name] || 0;
                                return sum + (file.size * (progress / 100));
                              }, 0);
                              const overallProgress = totalSize > 0 ? (uploadedSize / totalSize) * 100 : 0;
                              return `${bytes(uploadedSize)} / ${bytes(totalSize)} (${Math.round(overallProgress)}%)`;
                            })()}
                          </Text>
                        </Group>
                        <Progress
                          value={(() => {
                            const totalSize = uploadQueue.reduce((sum, file) => sum + file.size, 0);
                            const uploadedSize = uploadQueue.reduce((sum, file) => {
                              const progress = fileProgress[file.name] || 0;
                              return sum + (file.size * (progress / 100));
                            }, 0);
                            return totalSize > 0 ? (uploadedSize / totalSize) * 100 : 0;
                          })()}
                          size='xl'
                          radius='xl'
                          color={uploading ? 'blue' : 'green'}
                          striped={uploading}
                          animated={uploading}
                        />
                      </Stack>
                    )}
                    
                    <Group justify='space-between' align='center'>
                      <Box /> {/* Empty box for spacing */}
                      {!uploading && (
                        <Button
                          variant='light'
                          color='gray'
                          size='sm'
                          onClick={() => {
                            setFileProgress({});
                            setFileUploadSpeed({});
                            setUploadQueue([]);
                            setCurrentBatchIndex(0);
                          }}
                        >
                          Clear
                        </Button>
                      )}
                    </Group>

                    {uploadQueue.length > 0 ? (
                      // Split into unfinished (left) and finished (right) sections
                      <Box style={{ maxHeight: '50vh', overflowY: 'auto', paddingRight: 8 }}>
                        <Group align='flex-start' gap='lg' style={{ width: '100%' }}>
                        {/* Unfinished Files (Uploading + Waiting) */}
                        <Stack gap='md' style={{ flex: 1, minWidth: 0 }}>
                          <Group gap='xs'>
                            <Text size='sm' fw={600} c='gray'>
                              📤 File Upload
                            </Text>
                            <Badge size='sm' variant='light' color='gray'>
                              {uploadQueue.filter((f) => (fileProgress[f.name] || 0) < 100).length}
                            </Badge>
                          </Group>
                          
                          {uploadQueue
                            .map((file, index) => ({ file, index }))
                            .filter(({ file }) => (fileProgress[file.name] || 0) < 100)
                            .map(({ file, index }) => {
                              const fileName = file.name;
                              const percent = fileProgress[fileName] || 0;
                              const currentBatchStart = currentBatchIndex * batchSize;
                              const currentBatchEnd = currentBatchStart + batchSize;
                              const isUploading = index >= currentBatchStart && index < currentBatchEnd;
                              const isWaiting = index >= currentBatchEnd;
                              
                              return (
                                <Box 
                                  key={`unfinished-${fileName}-${index}`}
                                  p='md'
                                  style={{
                                    border: `1px solid ${
                                      isUploading ? 'rgba(24, 144, 255, 0.5)' : 'rgba(255, 255, 255, 0.2)'
                                    }`,
                                    borderRadius: '8px',
                                    backgroundColor: isUploading 
                                      ? 'rgba(24, 144, 255, 0.1)' 
                                      : 'rgba(255, 255, 255, 0.05)',
                                    opacity: isWaiting ? 0.6 : 1,
                                    transition: 'all 0.3s ease',
                                    animation: isUploading ? 'slideInFromLeft 0.5s ease-out' : 'none',
                                    boxShadow: isUploading ? '0 0 20px rgba(24, 144, 255, 0.3)' : 'none',
                                  }}
                                >
                                  <Group justify='space-between' mb='xs'>
                                    <Group gap='xs' style={{ flex: 1, minWidth: 0 }}>
                                      <Text 
                                        size='sm' 
                                        fw={500}
                                        style={{
                                          overflow: 'hidden',
                                          textOverflow: 'ellipsis',
                                          whiteSpace: 'nowrap',
                                          flex: 1,
                                        }}
                                        title={fileName}
                                      >
                                        {isUploading ? '⏳ ' : '⏸ '}{fileName}
                                      </Text>
                                      {isWaiting && (
                                        <Badge size='xs' variant='light' color='gray'>
                                          Waiting
                                        </Badge>
                                      )}
                                    </Group>
                                    <Text size='sm' fw={600} c='gray'>
                                      {isWaiting ? 'Waiting...' : `${Math.round(percent)}%`}
                                    </Text>
                                  </Group>
                                  {!isWaiting && (
                                    <Progress
                                      value={percent}
                                      size='lg'
                                      radius='xl'
                                      color='gray'
                                      striped
                                      animated
                                    />
                                  )}
                                </Box>
                              );
                            })}
                        </Stack>

                        {/* Finished Files (Right) */}
                        <Stack gap='md' style={{ flex: 1, minWidth: 0 }}>
                          <Group gap='xs'>
                            <Text size='sm' fw={600} c='green'>
                              ✅ Completed
                            </Text>
                            <Badge size='sm' variant='light' color='green'>
                              {uploadQueue.filter((f) => fileProgress[f.name] === 100).length}
                            </Badge>
                          </Group>
                          
                          {uploadQueue
                            .map((file, index) => ({ file, index }))
                            .filter(({ file }) => fileProgress[file.name] === 100)
                            .map(({ file, index }) => {
                              const fileName = file.name;
                              const percent = fileProgress[fileName];
                              
                              return (
                                <Box 
                                  key={`finished-${fileName}-${index}`}
                                  p='md'
                                  style={{
                                    border: '1px solid rgba(82, 196, 26, 0.5)',
                                    borderRadius: '8px',
                                    backgroundColor: 'rgba(82, 196, 26, 0.1)',
                                    transition: 'all 0.3s ease',
                                    animation: 'slideInRight 0.5s ease-out',
                                    boxShadow: '0 0 15px rgba(82, 196, 26, 0.2)',
                                  }}
                                >
                                  <Group justify='space-between' mb='xs'>
                                    <Text 
                                      size='sm' 
                                      fw={500}
                                      style={{
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                        flex: 1,
                                      }}
                                      title={fileName}
                                    >
                                      ✓ {fileName}
                                    </Text>
                                    <Text size='sm' fw={600} c='green'>
                                      100%
                                    </Text>
                                  </Group>
                                  <Progress
                                    value={100}
                                    size='lg'
                                    radius='xl'
                                    color='green'
                                  />
                                </Box>
                              );
                            })}
                        </Stack>
                        </Group>
                      </Box>
                    ) : (
                      <Box style={{ maxHeight: '50vh', overflowY: 'auto', paddingRight: 8 }}>
                        <Stack gap='md'>
                        {/* Total Progress Bar for non-queue uploads */}
                        {Object.keys(fileProgress).length > 0 && (
                          <Stack gap='xs'>
                            <Group justify='space-between' align='center'>
                              <Text size='sm' fw={600} c='gray'>
                                Total Progress
                              </Text>
                              <Text size='sm' fw={600} c='gray'>
                                {(() => {
                                  // For non-queue uploads, we need to estimate file sizes
                                  // Since we don't have access to original files here, we'll use a different approach
                                  const totalProgress = Object.values(fileProgress).reduce((sum, p) => sum + p, 0);
                                  const avgProgress = Object.keys(fileProgress).length > 0 ? totalProgress / Object.keys(fileProgress).length : 0;
                                  const completedFiles = Object.values(fileProgress).filter((p) => p === 100).length;
                                  return `${completedFiles}/${Object.keys(fileProgress).length} files (${Math.round(avgProgress)}%)`;
                                })()}
                              </Text>
                            </Group>
                            <Progress
                              value={(() => {
                                const totalProgress = Object.values(fileProgress).reduce((sum, p) => sum + p, 0);
                                return Object.keys(fileProgress).length > 0 ? totalProgress / Object.keys(fileProgress).length : 0;
                              })()}
                              size='xl'
                              radius='xl'
                              color={uploading ? 'blue' : 'green'}
                              striped={uploading}
                              animated={uploading}
                            />
                          </Stack>
                        )}
                        
                        {/* Fallback for non-queue uploads */}
                        {Object.entries(fileProgress).map(([fileName, percent]) => (
                          <Box 
                            key={fileName}
                            p='md'
                            style={{
                              border: '1px solid rgba(255, 255, 255, 0.2)',
                              borderRadius: '8px',
                              backgroundColor: 'rgba(255, 255, 255, 0.05)',
                            }}
                          >
                            <Group justify='space-between' mb='xs'>
                              <Text 
                                size='sm' 
                                fw={500}
                                style={{
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  maxWidth: 'calc(100% - 120px)',
                                }}
                                title={fileName}
                              >
                                {percent === 100 ? '✓ ' : '⏳ '}{fileName}
                              </Text>
                              <Text size='sm' fw={600} c={percent === 100 ? 'green' : 'gray'}>
                                {Math.round(percent)}%
                              </Text>
                            </Group>
                            <Progress
                              value={percent}
                              size='lg'
                              radius='xl'
                              color={percent === 100 ? 'green' : 'gray'}
                              striped={percent < 100}
                              animated={percent < 100}
                            />
                          </Box>
                        ))}
                        </Stack>
                      </Box>
                    )}
                  </Stack>
                </Box>
              )}
            </Paper>

            {/* File List - Hidden when uploading since progress is shown in Dropzone */}
            {getAllFiles().length > 0 && !uploading && Object.keys(fileProgress).length === 0 && (
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
                      <span
                        style={{
                          color: uploading ? '#74b9ff' : 'inherit',
                          transition: 'color 0.3s ease',
                        }}
                      >
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
                        title='Files upload automatically when selected - no manual upload needed'
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
      <UrlDownloadModal
        opened={urlDownloadOpened}
        onClose={closeUrlDownload}
        uploading={downloadingFromUrl}
        downloadUrl={downloadUrl}
        onDownloadUrlChange={setDownloadUrl}
        onSubmit={handleUrlDownload}
      />
    </Box>
  );
}

export const getServerSideProps = withSafeConfig();

StandaloneUpload.title = 'Upload';
