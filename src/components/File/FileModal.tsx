import {
  ActionIcon,
  Group,
  LoadingOverlay,
  Modal,
  Select,
  SimpleGrid,
  Stack,
  Title,
  Tooltip,
} from '@mantine/core';
import { useClipboard } from '@mantine/hooks';
import { showNotification } from '@mantine/notifications';
import {
  IconAlarm,
  IconCalendarPlus,
  IconClipboardCopy,
  IconDeviceSdCard,
  IconExternalLink,
  IconEye,
  IconEyeglass,
  IconFile,
  IconFileDownload,
  IconFolderMinus,
  IconFolderOff,
  IconFolderPlus,
  IconFolderX,
  IconHash,
  IconInfoCircle,
  IconPhoto,
  IconPhotoCancel,
  IconPhotoMinus,
  IconPhotoStar,
  IconStarFilled,
} from '@tabler/icons-react';
import useFetch from 'hooks/useFetch';
import { useFileDelete, useFileFavorite } from 'lib/queries/files';
import { useFolders } from 'lib/queries/folders';
import { bytesToHuman } from 'lib/utils/bytes';
import { relativeTime } from 'lib/utils/client';
import { useState } from 'react';
import { FileMeta } from '.';
import Type from '../Type';

export default function FileModal({
  open,
  setOpen,
  file,
  loading,
  refresh,
  reducedActions = false,
  exifEnabled,
  compress,
}: {
  open: boolean;
  setOpen: (open: boolean) => void;
  file: any;
  loading: boolean;
  refresh: () => void;
  reducedActions?: boolean;
  exifEnabled?: boolean;
  compress: boolean;
}) {
  const deleteFile = useFileDelete();
  const favoriteFile = useFileFavorite();
  const folders = useFolders();

  const [overrideRender, setOverrideRender] = useState(false);
  const clipboard = useClipboard();

  const handleDelete = async () => {
    deleteFile.mutate(file.id, {
      onSuccess: () => {
        showNotification({
          title: 'File Deleted',
          message: '',
          color: 'green',
          icon: <IconPhotoMinus />,
        });
      },

      onError: (res: any) => {
        showNotification({
          title: 'Failed to delete file',
          message: res.error,
          color: 'red',
          icon: <IconPhotoCancel />,
        });
      },

      onSettled: () => {
        setOpen(false);
      },
    });
  };

  const handleCopy = () => {
    clipboard.copy(`${window.location.protocol}//${window.location.host}${file.url}`);
    setOpen(false);
    if (!navigator.clipboard)
      showNotification({
        title: 'Unable to copy to clipboard',
        message: 'Zipline is unable to copy to clipboard due to security reasons.',
        color: 'red',
      });
    else
      showNotification({
        title: 'Copied to clipboard',
        message: '',
        icon: <IconClipboardCopy />,
      });
  };

  const handleFavorite = async () => {
    favoriteFile.mutate(
      { id: file.id, favorite: !file.favorite },
      {
        onSuccess: () => {
          showNotification({
            title: 'The file is now ' + (!file.favorite ? 'favorited' : 'unfavorited'),
            message: '',
            icon: <IconPhotoStar />,
          });
        },

        onError: (res: any) => {
          showNotification({
            title: 'Failed to favorite file',
            message: res.error,
            color: 'red',
            icon: <IconPhotoCancel />,
          });
        },
      }
    );
  };

  const inFolder = file.folderId;

  const removeFromFolder = async () => {
    const res = await useFetch('/api/user/folders/' + file.folderId, 'DELETE', {
      file: Number(file.id),
    });

    refresh();

    if (!res.error) {
      showNotification({
        title: 'Removed from folder',
        message: res.name,
        color: 'green',
        icon: <IconFolderMinus />,
      });
    } else {
      showNotification({
        title: 'Failed to remove from folder',
        message: res.error,
        color: 'red',
        icon: <IconFolderX />,
      });
    }
  };

  const addToFolder = async (t) => {
    const res = await useFetch('/api/user/folders/' + t, 'POST', {
      file: Number(file.id),
    });

    refresh();

    if (!res.error) {
      showNotification({
        title: 'Added to folder',
        message: res.name,
        color: 'green',
        icon: <IconFolderPlus />,
      });
    } else {
      showNotification({
        title: 'Failed to add to folder',
        message: res.error,
        color: 'red',
        icon: <IconFolderX />,
      });
    }
  };

  const createFolder = (t) => {
    useFetch('/api/user/folders', 'POST', {
      name: t,
      add: [Number(file.id)],
    }).then((res) => {
      refresh();

      if (!res.error) {
        showNotification({
          title: 'Created & added to folder',
          message: res.name,
          color: 'green',
          icon: <IconFolderPlus />,
        });
      } else {
        showNotification({
          title: 'Failed to create folder',
          message: res.error,
          color: 'red',
          icon: <IconFolderX />,
        });
      }
    });
    return { value: t, label: t };
  };

  return (
    <Modal opened={open} onClose={() => setOpen(false)} title={<Title>{file.name}</Title>} size='xl'>
      <LoadingOverlay visible={loading} />
      <Stack>
        <Type
          file={file}
          src={`/r/${encodeURI(file.name)}?nocompress=${!compress}`}
          alt={file.name}
          popup
          sx={{ minHeight: 200 }}
          style={{ minHeight: 200 }}
          disableMediaPreview={false}
          overrideRender={overrideRender}
          setOverrideRender={setOverrideRender}
        />
        <SimpleGrid
          my='md'
          cols={3}
          breakpoints={[
            { maxWidth: 600, cols: 1 },
            { maxWidth: 900, cols: 2 },
            { maxWidth: 1200, cols: 3 },
          ]}
        >
          <FileMeta Icon={IconFile} title='Name' subtitle={file.name} />
          <FileMeta Icon={IconPhoto} title='Type' subtitle={file.mimetype} />
          <FileMeta Icon={IconDeviceSdCard} title='Size' subtitle={bytesToHuman(file.size || 0)} />
          <FileMeta Icon={IconEye} title='Views' subtitle={file?.views?.toLocaleString()} />
          {file.maxViews && (
            <FileMeta
              Icon={IconEyeglass}
              title='Max views'
              subtitle={file?.maxViews?.toLocaleString()}
              tooltip={`This file will be deleted after being viewed ${file?.maxViews?.toLocaleString()} times.`}
            />
          )}
          <FileMeta
            Icon={IconCalendarPlus}
            title='Uploaded'
            subtitle={relativeTime(new Date(file.createdAt))}
            tooltip={new Date(file?.createdAt).toLocaleString()}
          />
          {file.expiresAt && !reducedActions && (
            <FileMeta
              Icon={IconAlarm}
              title='Expires'
              subtitle={relativeTime(new Date(file.expiresAt))}
              tooltip={new Date(file.expiresAt).toLocaleString()}
            />
          )}
          <FileMeta Icon={IconHash} title='ID' subtitle={file.id} />
        </SimpleGrid>
      </Stack>

      <Group position='apart' my='md'>
        <Group position='left'>
          {exifEnabled && !reducedActions && (
            <Tooltip label='View Metadata'>
              <ActionIcon
                color='blue'
                variant='filled'
                onClick={() => window.open(`/dashboard/metadata/${file.id}`, '_blank')}
              >
                <IconInfoCircle size='1rem' />
              </ActionIcon>
            </Tooltip>
          )}
          {reducedActions ? null : inFolder && !folders.isLoading ? (
            <Tooltip
              label={`Remove from folder "${folders.data.find((f) => f.id === file.folderId)?.name ?? ''}"`}
            >
              <ActionIcon color='red' variant='filled' onClick={removeFromFolder} loading={folders.isLoading}>
                <IconFolderMinus size='1rem' />
              </ActionIcon>
            </Tooltip>
          ) : (
            <Tooltip label='Add to folder'>
              <Select
                onChange={addToFolder}
                placeholder='Add to folder'
                data={[
                  ...(folders.data ? folders.data : []).map((folder) => ({
                    value: String(folder.id),
                    label: `${folder.id}: ${folder.name}`,
                  })),
                ]}
                searchable
                creatable
                getCreateLabel={(query) => `Create folder "${query}"`}
                onCreate={createFolder}
              />
            </Tooltip>
          )}
        </Group>
        <Group position='right'>
          {reducedActions ? null : (
            <>
              <Tooltip label='Delete file'>
                <ActionIcon color='red' variant='filled' onClick={handleDelete}>
                  <IconPhotoMinus size='1rem' />
                </ActionIcon>
              </Tooltip>

              <Tooltip label={file.favorite ? 'Unfavorite' : 'Favorite'}>
                <ActionIcon
                  color={file.favorite ? 'yellow' : 'gray'}
                  variant='filled'
                  onClick={handleFavorite}
                >
                  <IconPhotoStar size='1rem' />
                </ActionIcon>
              </Tooltip>
            </>
          )}

          <Tooltip label='Open in new tab'>
            <ActionIcon color='blue' variant='filled' onClick={() => window.open(file.url, '_blank')}>
              <IconExternalLink size='1rem' />
            </ActionIcon>
          </Tooltip>

          <Tooltip label='Copy URL'>
            <ActionIcon color='blue' variant='filled' onClick={handleCopy}>
              <IconClipboardCopy size='1rem' />
            </ActionIcon>
          </Tooltip>

          <Tooltip label='Download'>
            <ActionIcon
              color='blue'
              variant='filled'
              onClick={() => window.open(`/r/${encodeURI(file.name)}?download=true`, '_blank')}
            >
              <IconFileDownload size='1rem' />
            </ActionIcon>
          </Tooltip>
        </Group>
      </Group>
    </Modal>
  );
}
