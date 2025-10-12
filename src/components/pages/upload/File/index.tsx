import { useConfig } from '@/components/ConfigProvider';
import { useUploadOptionsStore } from '@/lib/store/uploadOptions';
import {
  ActionIcon,
  Button,
  Collapse,
  Group,
  Kbd,
  Modal,
  Pagination,
  Paper,
  Progress,
  Table,
  Text,
  Title,
  Tooltip,
  rem,
  useMantineTheme,
} from '@mantine/core';
import { Dropzone } from '@mantine/dropzone';
import { useClipboard, useColorScheme } from '@mantine/hooks';
import { notifications, showNotification } from '@mantine/notifications';
import { IconDeviceSdCard, IconFiles, IconTrashFilled, IconUpload, IconX } from '@tabler/icons-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import UploadOptionsButton from '../UploadOptionsButton';
import { uploadFiles } from '../uploadFiles';
import ToUploadFile from './ToUploadFile';
import { bytes } from '@/lib/bytes';
import { uploadPartialFiles } from '../uploadPartialFiles';
import { humanizeDuration } from '@/lib/relativeTime';
import { useShallow } from 'zustand/shallow';

export default function UploadFile({ title, folder }: { title?: string; folder?: string }) {
  const theme = useMantineTheme();
  const colorScheme = useColorScheme();
  const clipboard = useClipboard();
  const config = useConfig();

  const isMac = typeof navigator !== 'undefined' && navigator.userAgent.includes('Macintosh');

  const [options, ephemeral, clearEphemeral] = useUploadOptionsStore(
    useShallow((state) => [state.options, state.ephemeral, state.clearEphemeral]),
  );

  const [files, setFiles] = useState<File[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 250;
  const [progress, setProgress] = useState<{ percent: number; remaining: number; speed: number }>({
    percent: 0,
    remaining: 0,
    speed: 0,
  });
  const [dropLoading, setLoading] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [warningDetails, setWarningDetails] = useState({ fileCount: 0, totalSize: 0 });
  const [isSticky, setIsSticky] = useState(false);

  const handlePaste = (e: ClipboardEvent) => {
    if (!e.clipboardData) return;

    const pastedFiles: File[] = [];
    for (let i = 0; i !== e.clipboardData.items.length; ++i) {
      if (!e.clipboardData.items[i].type.startsWith('image')) return;

      const blob = e.clipboardData.items[i].getAsFile();
      if (!blob) return;

      pastedFiles.push(blob);
      showNotification({
        message: `Image ${blob.name} pasted from clipboard`,
        color: 'blue',
      });
    }

    if (pastedFiles.length > 0) {
      handleFilesAdded(pastedFiles);
    }
  };

  const aggSize = () => files.reduce((acc, file) => acc + file.size, 0);

  const truncateFileName = (fileName: string, maxLength: number = 30): string => {
    if (fileName.length <= maxLength) return fileName;
    const extension = fileName.split('.').pop() || '';
    const nameWithoutExt = fileName.slice(0, fileName.lastIndexOf('.'));
    if (nameWithoutExt.length <= maxLength - extension.length - 4) {
      return fileName;
    }
    const truncatedLength = maxLength - extension.length - 7;
    const truncated = nameWithoutExt.slice(0, truncatedLength) + '...' + nameWithoutExt.slice(-3);
    return `${truncated}.${extension}`;
  };

  const checkLargeUpload = (newFiles: File[], existingFiles: File[]) => {
    const allFiles = [...existingFiles, ...newFiles];
    const totalSize = allFiles.reduce((acc, file) => acc + file.size, 0);
    const fileCount = allFiles.length;
    const sizeLimitMB = 100 * 1024 * 1024;
    const fileCountLimit = 100;

    return {
      isLarge: fileCount > fileCountLimit || totalSize > sizeLimitMB,
      fileCount,
      totalSize,
      exceedsFileLimit: fileCount > fileCountLimit,
      exceedsSizeLimit: totalSize > sizeLimitMB,
    };
  };

  const handleFilesAdded = (newFiles: File[]) => {
    const uploadCheck = checkLargeUpload(newFiles, files);

    if (uploadCheck.isLarge) {
      setPendingFiles(newFiles);
      setWarningDetails({ fileCount: uploadCheck.fileCount, totalSize: uploadCheck.totalSize });
      setShowWarningModal(true);
    } else {
      const newFileList = [...newFiles, ...files];
      setFiles(newFileList);

      setCurrentPage(1);

      if (newFileList.length > 500) {
        showNotification({
          title: 'Large File Count Detected',
          message: `You have ${newFileList.length} files. Switching to table view for better performance.`,
          color: 'yellow',
          autoClose: 5000,
        });
      }
    }
  };

  const confirmLargeUpload = () => {
    const newFileList = [...pendingFiles, ...files];
    setFiles(newFileList);
    setShowWarningModal(false);
    setPendingFiles([]);
    setWarningDetails({ fileCount: 0, totalSize: 0 });

    setCurrentPage(1);

    if (newFileList.length > 500) {
      showNotification({
        title: 'Large File Count Detected',
        message: `You have ${newFileList.length} files. Switching to table view for better performance.`,
        color: 'yellow',
        autoClose: 5000,
      });
    }
  };

  const cancelLargeUpload = () => {
    setShowWarningModal(false);
    setPendingFiles([]);
    setWarningDetails({ fileCount: 0, totalSize: 0 });
  };

  const upload = () => {
    const toPartialFiles: File[] = [];
    for (let i = 0; i !== files.length; ++i) {
      const file = files[i];
      if (config.chunks.enabled && file.size >= bytes(config.chunks.max)) {
        toPartialFiles.push(file);
      }
    }

    if (toPartialFiles.length > 0) {
      uploadPartialFiles(toPartialFiles, {
        setFiles,
        setLoading,
        setProgress,
        clipboard,
        clearEphemeral,
        options,
        ephemeral,
        config,
        folder,
      });
    } else {
      const size = aggSize();
      if (size > bytes(config.files.maxFileSize) && !toPartialFiles.length) {
        notifications.show({
          title: 'Upload may fail',
          color: 'yellow',
          icon: <IconDeviceSdCard size='1rem' />,
          message: (
            <>
              The upload may fail because the total size of the files (that are not being partially uploaded)
              you are trying to upload is <b>{bytes(size)}</b>, which is larger than the limit of{' '}
              <b>{bytes(bytes(config.files.maxFileSize))}</b>
            </>
          ),
        });
      }

      uploadFiles(files, {
        setFiles,
        setLoading,
        setProgress,
        clipboard,
        clearEphemeral,
        options,
        ephemeral,
        folder,
      });
    }
  };

  useEffect(() => {
    document.addEventListener('paste', handlePaste);

    return () => {
      document.removeEventListener('paste', handlePaste);
    };
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const buttonGroup = document.querySelector('[data-sticky-buttons]');
      if (buttonGroup) {
        const rect = buttonGroup.getBoundingClientRect();
        setIsSticky(rect.top <= 70);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      <Group gap='sm'>
        <Title order={1}>{title ?? 'Upload files'}</Title>

        {!folder && (
          <Tooltip label='View your files'>
            <ActionIcon component={Link} href='/dashboard/files' variant='outline' radius='sm'>
              <IconFiles size={18} />
            </ActionIcon>
          </Tooltip>
        )}
      </Group>

      <Dropzone onDrop={handleFilesAdded} my='sm' loading={dropLoading} disabled={dropLoading}>
        <Group justify='center' gap='xl' style={{ minHeight: rem(220), pointerEvents: 'none' }}>
          <Dropzone.Accept>
            <IconUpload
              size='3.2rem'
              stroke={1.5}
              color={theme.colors[theme.primaryColor][colorScheme === 'dark' ? 4 : 6]}
            />
          </Dropzone.Accept>
          <Dropzone.Reject>
            <IconX size='3.2rem' stroke={1.5} color={theme.colors.red[colorScheme === 'dark' ? 4 : 6]} />
          </Dropzone.Reject>
          <Dropzone.Idle>
            <IconFiles size='3.2rem' stroke={1.5} />
          </Dropzone.Idle>

          <div>
            <Text size='xl' inline>
              Drag images here or click to select files
            </Text>
            <Text size='sm' inline mt='xs'>
              Or <Kbd size='xs'>{isMac ? '⌘' : 'Ctrl'}</Kbd> + <Kbd size='xs'>V</Kbd> to paste images from
              clipboard
            </Text>
            <Text size='sm' c='dimmed' inline mt={7}>
              Attach as many files as you like, they will show up below to review before uploading.
            </Text>
            <Text size='sm' c='dimmed' mt={7}>
              <b>{bytes(bytes(config.files.maxFileSize))}</b> limit per file
            </Text>
          </div>
        </Group>
      </Dropzone>

      <Collapse in={progress.percent > 0 && progress.percent < 100}>
        {progress.percent > 0 && progress.percent < 100 && (
          <Progress.Root my='sm' size='xl'>
            <Progress.Section value={progress.percent} animated>
              <Progress.Label>{Math.floor(progress.percent)}%</Progress.Label>
            </Progress.Section>
          </Progress.Root>
        )}
      </Collapse>

      <Collapse in={progress.speed > 0 && progress.remaining > 0}>
        <Paper withBorder p='xs' radius='sm' my='sm'>
          <Text ta='center' size='sm'>
            {bytes(progress.speed)}/s, {humanizeDuration(progress.remaining)} remaining
          </Text>
        </Paper>
      </Collapse>

      <Collapse in={progress.percent === 100}>
        <Paper withBorder p='xs' radius='sm' my='sm'>
          <Text ta='center' size='sm' c='yellow' fw={500}>
            Finalizing upload(s)...
          </Text>
        </Paper>
      </Collapse>

      <Group
        data-sticky-buttons
        justify='space-between'
        gap='sm'
        p='md'
        style={{
          position: 'sticky',
          top: '60px',
          zIndex: 99,
          backgroundColor:
            colorScheme === 'dark' ? (isSticky ? '#0009' : 'rgba(24, 28, 40, 0.6)') : 'rgb(0, 0, 0)',
          backdropFilter: 'blur(10px)',
          padding: '1rem',
          border: '1px solid ' + (colorScheme === 'dark' ? theme.colors.dark[5] : theme.colors.gray[2]),
          borderRadius: !isSticky ? '0.5rem' : ' 0 0 0.5rem 0.5rem',
          margin: files.length > 0 ? '8px 0 16px 0' : '8px 0 0 0',
          transition: 'all 0.2s ease',
        }}
      >
        <Button
          variant='outline'
          color='red'
          leftSection={<IconTrashFilled size={18} />}
          disabled={files.length === 0 || dropLoading}
          onClick={() => setFiles([])}
          style={{
            backgroundColor: isSticky ? 'rgba(20, 20, 20, 0.8)' : '',
            color: !files.length ? 'var(--button-color, var(--mantine-color-white))' : '',
          }}
        >
          Clear All
        </Button>

        <Group gap='sm'>
          <UploadOptionsButton folder={folder} numFiles={files.length} sticked={isSticky} />

          <Button
            variant='outline'
            leftSection={<IconUpload size={18} />}
            disabled={files.length === 0 || dropLoading}
            onClick={upload}
            style={{
              backgroundColor: isSticky ? 'rgba(20, 20, 20, 0.8)' : '',
              color: !files.length ? 'var(--button-color, var(--mantine-color-white))' : '',
            }}
          >
            Upload {files.length} files ({bytes(aggSize())})
          </Button>
        </Group>
      </Group>

      {files.length > 500 ? (
        <Paper withBorder radius='md' m='md'>
          <Group gap='md' align='flex-start' style={{ width: '100%' }}>
            <div style={{ flex: 1 }}>
              <Table striped highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>File Name</Table.Th>
                    <Table.Th>Type</Table.Th>
                    <Table.Th>Size</Table.Th>
                    <Table.Th style={{ width: '60px' }}>Action</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {files
                    .slice(
                      (currentPage - 1) * itemsPerPage,
                      (currentPage - 1) * itemsPerPage + Math.ceil(itemsPerPage / 2),
                    )
                    .map((file, i) => {
                      const actualIndex = (currentPage - 1) * itemsPerPage + i;
                      return (
                        <Table.Tr
                          key={actualIndex}
                          style={
                            file.size === 0
                              ? {
                                  backgroundColor: 'rgba(255, 255, 0, 0.1)',
                                  borderLeft: '3px solid #ffd43b',
                                }
                              : {}
                          }
                        >
                          <Table.Td>
                            <Text size='sm' title={file.name}>
                              {truncateFileName(file.name)}
                            </Text>
                          </Table.Td>
                          <Table.Td>
                            <Text size='sm' c='dimmed'>
                              {file.type.split('/')[0] || 'file'}
                            </Text>
                          </Table.Td>
                          <Table.Td>
                            <Text
                              size='sm'
                              c={file.size === 0 ? 'yellow' : 'dimmed'}
                              fw={file.size === 0 ? 600 : undefined}
                            >
                              {bytes(file.size)}
                            </Text>
                          </Table.Td>
                          <Table.Td>
                            <ActionIcon
                              variant='subtle'
                              color='red'
                              size='sm'
                              onClick={() => {
                                const newFiles = files.filter((_, j) => actualIndex !== j);
                                setFiles(newFiles);

                                const totalPages = Math.ceil(newFiles.length / itemsPerPage);
                                if (currentPage > totalPages && totalPages > 0) {
                                  setCurrentPage(totalPages);
                                }
                              }}
                              disabled={dropLoading}
                            >
                              <IconTrashFilled size='1rem' />
                            </ActionIcon>
                          </Table.Td>
                        </Table.Tr>
                      );
                    })}
                </Table.Tbody>
              </Table>
            </div>

            <div style={{ flex: 1 }}>
              <Table striped highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>File Name</Table.Th>
                    <Table.Th>Type</Table.Th>
                    <Table.Th>Size</Table.Th>
                    <Table.Th style={{ width: '60px' }}>Action</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {files
                    .slice(
                      (currentPage - 1) * itemsPerPage + Math.ceil(itemsPerPage / 2),
                      currentPage * itemsPerPage,
                    )
                    .map((file, i) => {
                      const actualIndex = (currentPage - 1) * itemsPerPage + Math.ceil(itemsPerPage / 2) + i;
                      return (
                        <Table.Tr
                          key={actualIndex}
                          style={
                            file.size === 0
                              ? {
                                  backgroundColor: 'rgba(255, 255, 0, 0.1)',
                                  borderLeft: '3px solid #ffd43b',
                                }
                              : {}
                          }
                        >
                          <Table.Td>
                            <Text size='sm' title={file.name}>
                              {truncateFileName(file.name)}
                            </Text>
                          </Table.Td>
                          <Table.Td>
                            <Text size='sm' c='dimmed'>
                              {file.type.split('/')[0] || 'file'}
                            </Text>
                          </Table.Td>
                          <Table.Td>
                            <Text
                              size='sm'
                              c={file.size === 0 ? 'yellow' : 'dimmed'}
                              fw={file.size === 0 ? 600 : undefined}
                            >
                              {bytes(file.size)}
                            </Text>
                          </Table.Td>
                          <Table.Td>
                            <ActionIcon
                              variant='subtle'
                              color='red'
                              size='sm'
                              onClick={() => {
                                const newFiles = files.filter((_, j) => actualIndex !== j);
                                setFiles(newFiles);

                                const totalPages = Math.ceil(newFiles.length / itemsPerPage);
                                if (currentPage > totalPages && totalPages > 0) {
                                  setCurrentPage(totalPages);
                                }
                              }}
                              disabled={dropLoading}
                            >
                              <IconTrashFilled size='1rem' />
                            </ActionIcon>
                          </Table.Td>
                        </Table.Tr>
                      );
                    })}
                </Table.Tbody>
              </Table>
            </div>
          </Group>

          <Group justify='center' p='md'>
            <Pagination
              total={Math.ceil(files.length / itemsPerPage)}
              value={currentPage}
              onChange={setCurrentPage}
              size='sm'
            />
            <Text size='sm' c='dimmed'>
              Showing {Math.min((currentPage - 1) * itemsPerPage + 1, files.length)}-
              {Math.min(currentPage * itemsPerPage, files.length)} of {files.length} files
            </Text>
          </Group>
        </Paper>
      ) : (
        <div
          style={{
            columnCount: 'auto',
            columnWidth: '25vh',
            columnGap: '1rem',
          }}
        >
          {files.map((file, i) => (
            <ToUploadFile
              key={i}
              loading={dropLoading}
              file={file}
              onDelete={() => setFiles(files.filter((_, j) => i !== j))}
            />
          ))}
        </div>
      )}

      <Modal
        opened={showWarningModal}
        onClose={cancelLargeUpload}
        title='Large Upload Warning'
        size='md'
        centered
      >
        <Text mb='md'>
          <strong>Warning:</strong> You have selected{' '}
          {warningDetails.fileCount > 100 && (
            <>
              <b>{warningDetails.fileCount} files</b> (over 100 files)
            </>
          )}
          {warningDetails.fileCount > 100 && warningDetails.totalSize > 100 * 1024 * 1024 && <> and </>}
          {warningDetails.totalSize > 100 * 1024 * 1024 && (
            <>
              <b>{bytes(warningDetails.totalSize)}</b> (over 100 MB)
            </>
          )}
          .
        </Text>
        <Text mb='lg' c='dimmed'>
          Generating previews for this many files may cause your browser to freeze temporarily. Consider
          uploading fewer files at once for better performance.
        </Text>
        <Group justify='flex-end' gap='sm'>
          <Button variant='outline' onClick={cancelLargeUpload}>
            Cancel
          </Button>
          <Button color='orange' onClick={confirmLargeUpload}>
            Continue Anyway
          </Button>
        </Group>
      </Modal>
    </>
  );
}
