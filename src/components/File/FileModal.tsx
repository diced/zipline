import {
  ActionIcon,
  Group,
  LoadingOverlay,
  Modal,
  MultiSelect,
  Select,
  SimpleGrid,
  Stack,
  Title,
  Tooltip,
  Text,
  Accordion,
} from '@mantine/core';
import { useClipboard, useMediaQuery } from '@mantine/hooks';
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
  IconFolderCancel,
  IconFolderMinus,
  IconFolderPlus,
  IconFolders,
  IconHash,
  IconInfoCircle,
  IconPhoto,
  IconPhotoCancel,
  IconPhotoMinus,
  IconPhotoStar,
  IconPlus,
  IconTags,
} from '@tabler/icons-react';
import useFetch, { ApiError } from 'hooks/useFetch';
import { useFileDelete, useFileFavorite, UserFilesResponse } from 'lib/queries/files';
import { useFolders } from 'lib/queries/folders';
import { bytesToHuman } from 'lib/utils/bytes';
import { colorHash, relativeTime } from 'lib/utils/client';
import { useState } from 'react';
import { FileMeta } from '.';
import Type from '../Type';
import Tag from 'components/File/tag/Tag';
import Item from 'components/File/tag/Item';

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
  file: UserFilesResponse;
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

  const [tags, setTags] = useState<{ label: string; value: string; color: string }[]>([
    { label: 'Tag 1', value: 'tag-1', color: '#ff0000' },
    { label: 'Tag 2', value: 'tag-2', color: '#00ff00' },
    { label: 'Tag 3', value: 'tag-3', color: '#0000ff' },
  ]);

  const handleDelete = async () => {
    deleteFile.mutate(file.id, {
      onSuccess: () => {
        showNotification({
          title: 'File Deleted',
          message: '',
          color: 'green',
          icon: <IconPhotoMinus size='1rem' />,
        });
      },

      onError: (res: ApiError) => {
        showNotification({
          title: 'Failed to delete file',
          message: res.error,
          color: 'red',
          icon: <IconPhotoCancel size='1rem' />,
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
        icon: <IconClipboardCopy size='1rem' />,
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
            icon: <IconPhotoStar size='1rem' />,
          });
        },

        onError: (res: { error: string }) => {
          showNotification({
            title: 'Failed to favorite file',
            message: res.error,
            color: 'red',
            icon: <IconPhotoCancel size='1rem' />,
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
        icon: <IconFolderMinus size='1rem' />,
      });
    } else {
      showNotification({
        title: 'Failed to remove from folder',
        message: res.error,
        color: 'red',
        icon: <IconFolderCancel size='1rem' />,
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
        icon: <IconFolderPlus size='1rem' />,
      });
    } else {
      showNotification({
        title: 'Failed to add to folder',
        message: res.error,
        color: 'red',
        icon: <IconFolderCancel size='1rem' />,
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
          icon: <IconFolderPlus size='1rem' />,
        });
      } else {
        showNotification({
          title: 'Failed to create folder',
          message: res.error,
          color: 'red',
          icon: <IconFolderCancel size='1rem' />,
        });
      }
    });
    return { value: t, label: t };
  };

  const handleTagsSave = () => {
    console.log('should save');
  };

  return (
    <Modal
      opened={open}
      onClose={() => setOpen(false)}
      title={<Title>{file.name}</Title>}
      size='lg'
      fullScreen={useMediaQuery('(max-width: 600px)')}
    >
      <LoadingOverlay visible={loading} />
      <Stack>
        <Type
          file={file}
          src={`/r/${encodeURI(file.name)}?compress=${compress}`}
          alt={file.name}
          popup
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

      {!reducedActions ? (
        <Accordion
          variant='contained'
          mb='sm'
          styles={(t) => ({
            content: { backgroundColor: t.colorScheme === 'dark' ? t.colors.dark[7] : t.colors.gray[0] },
            control: { backgroundColor: t.colorScheme === 'dark' ? t.colors.dark[7] : t.colors.gray[0] },
          })}
        >
          <Accordion.Item value='tags'>
            <Accordion.Control icon={<IconTags size='1rem' />}>Tags</Accordion.Control>
            <Accordion.Panel>
              <MultiSelect
                data={tags}
                placeholder={tags.length ? 'Add tags' : 'Add tags (optional)'}
                icon={<IconTags size='1rem' />}
                valueComponent={Tag}
                itemComponent={Item}
                searchable
                creatable
                getCreateLabel={(t) => (
                  <Group>
                    <IconPlus size='1rem' />
                    <Text ml='sm' display='flex'>
                      Create tag{' '}
                      <Text ml={4} color={colorHash(t)}>
                        &quot;{t}&quot;
                      </Text>
                    </Text>
                  </Group>
                )}
                onCreate={(t) => {
                  const item = { value: t, label: t, color: colorHash(t) };
                  setTags([...tags, item]);
                  return item;
                }}
                onBlur={handleTagsSave}
              />
            </Accordion.Panel>
          </Accordion.Item>
          <Accordion.Item value='folders'>
            <Accordion.Control icon={<IconFolders size='1rem' />}>Folders</Accordion.Control>
            <Accordion.Panel>
              {inFolder && !folders.isLoading ? (
                <Group>
                  <Tooltip
                    label={`Remove from folder "${
                      folders.data.find((f) => f.id === file.folderId)?.name ?? ''
                    }"`}
                  >
                    <ActionIcon
                      color='red'
                      variant='filled'
                      onClick={removeFromFolder}
                      loading={folders.isLoading}
                    >
                      <IconFolderMinus size='1rem' />
                    </ActionIcon>
                  </Tooltip>

                  <Text display='flex' align='center'>
                    Currently in folder &quot;{folders.data.find((f) => f.id === file.folderId)?.name ?? ''}
                    &quot;
                  </Text>
                </Group>
              ) : (
                <Tooltip label='Add to folder'>
                  <Select
                    icon={<IconFolderPlus size='1rem' />}
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
            </Accordion.Panel>
          </Accordion.Item>
        </Accordion>
      ) : null}

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
