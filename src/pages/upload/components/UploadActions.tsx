import { Paper, Group, Button } from '@mantine/core';
import {
  IconFiles,
  IconFolder,
  IconDownload,
  IconClipboard,
  IconUpload,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';

interface UploadActionsProps {
  uploadInProgress: boolean;
  uploading: boolean;
  isUploadingRef: React.RefObject<boolean>;
  fileProgressCount: number;
  onFilesSelected: (files: File[]) => void;
  onFolderSelected: (files: File[]) => void;
  onUrlDownloadOpen: () => void;
}

export function UploadActions({
  uploadInProgress,
  uploading,
  isUploadingRef,
  fileProgressCount,
  onFilesSelected,
  onFolderSelected,
  onUrlDownloadOpen,
}: UploadActionsProps) {
  const isDisabled = uploadInProgress || uploading || isUploadingRef.current || fileProgressCount > 0;

  const handleFileClick = () => {
    if (isDisabled) {
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
        onFilesSelected(Array.from(target.files));
      }
    };
    input.click();
  };

  const handleFolderClick = () => {
    if (isDisabled) {
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
          onFolderSelected(fileArray);
        }
      }
    };
    input.click();
  };

  const handlePasteClick = () => {
    notifications.show({
      title: 'Paste ready',
      message: 'Copy an image and press Ctrl+V to paste it here',
      color: 'blue',
    });
  };

  return (
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
          onClick={handleFileClick}
          radius='md'
          size='md'
          disabled={isDisabled}
        >
          Select Files
        </Button>
        <Button
          variant='light'
          leftSection={<IconFolder size='0.8rem' />}
          onClick={handleFolderClick}
          radius='md'
          size='md'
          disabled={isDisabled}
        >
          Select Folder
        </Button>
        <Button
          variant='light'
          leftSection={<IconDownload size='0.8rem' />}
          onClick={onUrlDownloadOpen}
          radius='md'
          size='md'
        >
          Download from URL
        </Button>
        <Button
          variant='light'
          leftSection={<IconClipboard size='0.8rem' />}
          onClick={handlePasteClick}
          radius='md'
          size='md'
        >
          Paste from Clipboard
        </Button>
      </Group>
    </Paper>
  );
}
