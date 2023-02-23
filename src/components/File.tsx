import {
  ActionIcon,
  Card,
  Group,
  LoadingOverlay,
  Modal,
  Select,
  SimpleGrid,
  Stack,
  Text,
  Title,
  Tooltip,
} from '@mantine/core';
import { useClipboard } from '@mantine/hooks';
import { showNotification } from '@mantine/notifications';
import useFetch from 'hooks/useFetch';
import { useFileDelete, useFileFavorite } from 'lib/queries/files';
import { useFolders } from 'lib/queries/folders';
import { relativeTime } from 'lib/utils/client';
import { useState } from 'react';
import {
  CalendarIcon,
  ClockIcon,
  CopyIcon,
  CrossIcon,
  DeleteIcon,
  DownloadIcon,
  ExternalLinkIcon,
  EyeIcon,
  FileIcon,
  FolderMinusIcon,
  FolderPlusIcon,
  HashIcon,
  ImageIcon,
  InfoIcon,
  StarIcon,
} from './icons';
import MutedText from './MutedText';
import Type from './Type';

export function FileMeta({ Icon, title, subtitle, ...other }) {
  return other.tooltip ? (
    <Group>
      <Icon size={24} />
      <Tooltip label={other.tooltip}>
        <Stack spacing={1}>
          <Text>{title}</Text>
          <MutedText size='md'>{subtitle}</MutedText>
        </Stack>
      </Tooltip>
    </Group>
  ) : (
    <Group>
      <Icon size={24} />
      <Stack spacing={1}>
        <Text>{title}</Text>
        <MutedText size='md'>{subtitle}</MutedText>
      </Stack>
    </Group>
  );
}

export default function File({
  image,
  disableMediaPreview,
  exifEnabled,
  refreshImages,
  reducedActions = false,
}) {
  const [open, setOpen] = useState(false);
  const [overrideRender, setOverrideRender] = useState(false);
  const deleteFile = useFileDelete();
  const favoriteFile = useFileFavorite();
  const clipboard = useClipboard();

  const folders = useFolders();

  const loading = deleteFile.isLoading || favoriteFile.isLoading;

  const handleDelete = async () => {
    deleteFile.mutate(image.id, {
      onSuccess: () => {
        showNotification({
          title: 'File Deleted',
          message: '',
          color: 'green',
          icon: <DeleteIcon />,
        });
      },

      onError: (res: any) => {
        showNotification({
          title: 'Failed to delete file',
          message: res.error,
          color: 'red',
          icon: <CrossIcon />,
        });
      },

      onSettled: () => {
        setOpen(false);
      },
    });
  };

  const handleCopy = () => {
    clipboard.copy(`${window.location.protocol}//${window.location.host}${image.url}`);
    setOpen(false);
    showNotification({
      title: 'Copied to clipboard',
      message: '',
      icon: <CopyIcon />,
    });
  };

  const handleFavorite = async () => {
    favoriteFile.mutate(
      { id: image.id, favorite: !image.favorite },
      {
        onSuccess: () => {
          showNotification({
            title: 'Image is now ' + (!image.favorite ? 'favorited' : 'unfavorited'),
            message: '',
            icon: <StarIcon />,
          });
        },

        onError: (res: any) => {
          showNotification({
            title: 'Failed to favorite file',
            message: res.error,
            color: 'red',
            icon: <CrossIcon />,
          });
        },
      }
    );
  };

  const inFolder = image.folderId;

  const refresh = () => {
    refreshImages();
    folders.refetch();
  };

  const removeFromFolder = async () => {
    const res = await useFetch('/api/user/folders/' + image.folderId, 'DELETE', {
      file: Number(image.id),
    });

    refresh();

    if (!res.error) {
      showNotification({
        title: 'Removed from folder',
        message: res.name,
        color: 'green',
        icon: <FolderMinusIcon />,
      });
    } else {
      showNotification({
        title: 'Failed to remove from folder',
        message: res.error,
        color: 'red',
        icon: <CrossIcon />,
      });
    }
  };

  const addToFolder = async (t) => {
    const res = await useFetch('/api/user/folders/' + t, 'POST', {
      file: Number(image.id),
    });

    refresh();

    if (!res.error) {
      showNotification({
        title: 'Added to folder',
        message: res.name,
        color: 'green',
        icon: <FolderPlusIcon />,
      });
    } else {
      showNotification({
        title: 'Failed to add to folder',
        message: res.error,
        color: 'red',
        icon: <CrossIcon />,
      });
    }
  };

  const createFolder = (t) => {
    useFetch('/api/user/folders', 'POST', {
      name: t,
      add: [Number(image.id)],
    }).then((res) => {
      refresh();

      if (!res.error) {
        showNotification({
          title: 'Created & added to folder',
          message: res.name,
          color: 'green',
          icon: <FolderPlusIcon />,
        });
      } else {
        showNotification({
          title: 'Failed to create folder',
          message: res.error,
          color: 'red',
          icon: <CrossIcon />,
        });
      }
    });
    return { value: t, label: t };
  };

  return (
    <>
      <Modal opened={open} onClose={() => setOpen(false)} title={<Title>{image.name}</Title>} size='xl'>
        <LoadingOverlay visible={loading} />
        <Stack>
          <Type
            file={image}
            src={`/r/${encodeURI(image.name)}`}
            alt={image.name}
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
            <FileMeta Icon={FileIcon} title='Name' subtitle={image.name} />
            <FileMeta Icon={ImageIcon} title='Type' subtitle={image.mimetype} />
            <FileMeta Icon={EyeIcon} title='Views' subtitle={image?.views?.toLocaleString()} />
            {image.maxViews && (
              <FileMeta
                Icon={EyeIcon}
                title='Max views'
                subtitle={image?.maxViews?.toLocaleString()}
                tooltip={`This file will be deleted after being viewed ${image?.maxViews?.toLocaleString()} times.`}
              />
            )}
            <FileMeta
              Icon={CalendarIcon}
              title='Uploaded'
              subtitle={relativeTime(new Date(image.createdAt))}
              tooltip={new Date(image?.createdAt).toLocaleString()}
            />
            {image.expiresAt && !reducedActions && (
              <FileMeta
                Icon={ClockIcon}
                title='Expires'
                subtitle={relativeTime(new Date(image.expiresAt))}
                tooltip={new Date(image.expiresAt).toLocaleString()}
              />
            )}
            <FileMeta Icon={HashIcon} title='ID' subtitle={image.id} />
          </SimpleGrid>
        </Stack>

        <Group position='apart' my='md'>
          <Group position='left'>
            {exifEnabled && !reducedActions && (
              <Tooltip label='View Metadata'>
                <ActionIcon
                  color='blue'
                  variant='filled'
                  onClick={() => window.open(`/dashboard/metadata/${image.id}`, '_blank')}
                >
                  <InfoIcon />
                </ActionIcon>
              </Tooltip>
            )}
            {reducedActions ? null : inFolder && !folders.isLoading ? (
              <Tooltip
                label={`Remove from folder "${
                  folders.data.find((f) => f.id === image.folderId)?.name ?? ''
                }"`}
              >
                <ActionIcon
                  color='red'
                  variant='filled'
                  onClick={removeFromFolder}
                  loading={folders.isLoading}
                >
                  <FolderMinusIcon />
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
                    <DeleteIcon />
                  </ActionIcon>
                </Tooltip>

                <Tooltip label={image.favorite ? 'Unfavorite' : 'Favorite'}>
                  <ActionIcon
                    color={image.favorite ? 'yellow' : 'gray'}
                    variant='filled'
                    onClick={handleFavorite}
                  >
                    <StarIcon />
                  </ActionIcon>
                </Tooltip>
              </>
            )}

            <Tooltip label='Open in new tab'>
              <ActionIcon color='blue' variant='filled' onClick={() => window.open(image.url, '_blank')}>
                <ExternalLinkIcon />
              </ActionIcon>
            </Tooltip>

            <Tooltip label='Copy URL'>
              <ActionIcon color='blue' variant='filled' onClick={handleCopy}>
                <CopyIcon />
              </ActionIcon>
            </Tooltip>

            <Tooltip label='Download'>
              <ActionIcon
                color='blue'
                variant='filled'
                onClick={() => window.open(`/r/${encodeURI(image.name)}?download=true`, '_blank')}
              >
                <DownloadIcon />
              </ActionIcon>
            </Tooltip>
          </Group>
        </Group>
      </Modal>
      <Card sx={{ maxWidth: '100%', height: '100%' }} shadow='md'>
        <Card.Section>
          <LoadingOverlay visible={loading} />
          <Type
            file={image}
            sx={{
              minHeight: 200,
              maxHeight: 320,
              fontSize: 70,
              width: '100%',
              cursor: 'pointer',
            }}
            style={{
              minHeight: 200,
              maxHeight: 320,
              fontSize: 70,
              width: '100%',
              cursor: 'pointer',
            }}
            src={`/r/${encodeURI(image.name)}`}
            alt={image.name}
            onClick={() => setOpen(true)}
            disableMediaPreview={disableMediaPreview}
          />
        </Card.Section>
      </Card>
    </>
  );
}
