import {
  ActionIcon,
  Button,
  Center,
  Group,
  Menu,
  Pagination,
  Paper,
  Select,
  Skeleton,
  Stack,
  Text,
  Title,
  Tooltip,
} from '@mantine/core';
import {
  IconFileUpload,
  IconFilesOff,
  IconTrash,
  IconHeart,
  IconHeartFilled,
  IconFolder,
  IconSelect,
  IconSelectAll,
  IconX,
  IconTags,
} from '@tabler/icons-react';
import { showNotification } from '@mantine/notifications';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { parseAsInteger, useQueryState } from 'nuqs';
import { useEffect, useState } from 'react';
import { useApiPagination } from '../useApiPagination';
import FolderSelectModal from '../FolderSelectModal';
import TagSelectModal from '../TagSelectModal';
import { bulkAddTags } from '../bulk';

const DashboardFile = dynamic(() => import('@/components/file/DashboardFile'), {
  loading: () => <Skeleton height={350} animate />,
});

const PER_PAGE_OPTIONS = [20, 30, 50, 100, 200, 500, 1000];

export default function Files({ id }: { id?: string }) {
  const [page, setPage] = useQueryState('page', parseAsInteger.withDefault(1));
  const [perpage, setPerpage] = useState<number>(50);
  const [cachedPages, setCachedPages] = useState<number>(1);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  const [folderModalOpened, setFolderModalOpened] = useState(false);
  const [tagModalOpened, setTagModalOpened] = useState(false);
  const [movingToFolder, setMovingToFolder] = useState(false);
  const [favoritesOnly, setFavoritesOnly] = useState(false);

  const { data, isLoading, mutate } = useApiPagination({
    page,
    perpage,
    id,
    favorite: favoritesOnly || undefined,
  });

  useEffect(() => {
    if (data?.pages) {
      setCachedPages(data.pages);
    }
  }, [data?.pages]);

  useEffect(() => {
    setPage(1);
  }, [favoritesOnly, setPage]);

  const handleFileSelect = (fileId: string, selected: boolean) => {
    const newSelected = new Set(selectedFiles);
    if (selected) {
      newSelected.add(fileId);
    } else {
      newSelected.delete(fileId);
    }
    setSelectedFiles(newSelected);
  };

  const handleSelectAll = () => {
    if (!data?.page) return;
    const allFileIds = new Set(data.page.map((file) => file.id));
    setSelectedFiles(allFileIds);
  };

  const handleDeselectAll = () => {
    setSelectedFiles(new Set());
  };

  const handleBulkDelete = async () => {
    if (selectedFiles.size === 0) return;

    try {
      const response = await fetch('/api/files/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileIds: Array.from(selectedFiles) }),
      });

      if (response.ok) {
        showNotification({
          title: 'Success',
          message: `Deleted ${selectedFiles.size} files`,
          color: 'green',
        });
        setSelectedFiles(new Set());

        mutate();
      }
    } catch {
      showNotification({
        title: 'Error',
        message: 'Failed to delete files',
        color: 'red',
      });
    }
  };

  const handleBulkFavorite = async () => {
    if (selectedFiles.size === 0) return;

    try {
      const response = await fetch('/api/files/bulk-favorite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileIds: Array.from(selectedFiles) }),
      });

      if (response.ok) {
        showNotification({
          title: 'Success',
          message: `Added ${selectedFiles.size} files to favorites`,
          color: 'green',
        });
        setSelectedFiles(new Set());

        mutate();
      }
    } catch {
      showNotification({
        title: 'Error',
        message: 'Failed to add files to favorites',
        color: 'red',
      });
    }
  };

  const handleMoveToFolder = async (folderId: string | null) => {
    if (selectedFiles.size === 0) return;

    setMovingToFolder(true);
    try {
      const response = await fetch('/api/files/move-to-folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileIds: Array.from(selectedFiles),
          folderId: folderId === '' ? null : folderId,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        showNotification({
          title: 'Success',
          message: `Moved ${result.moved} files to ${folderId ? 'folder' : 'root'}`,
          color: 'green',
        });
        setSelectedFiles(new Set());
        setFolderModalOpened(false);

        mutate();
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to move files');
      }
    } catch (error) {
      showNotification({
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to move files to folder',
        color: 'red',
      });
    } finally {
      setMovingToFolder(false);
    }
  };

  const handleAddTags = async (tagIds: string[]) => {
    if (selectedFiles.size === 0 || tagIds.length === 0) return;

    try {
      await bulkAddTags(Array.from(selectedFiles), tagIds);
      setSelectedFiles(new Set());
      setTagModalOpened(false);

      mutate();
    } catch {
      showNotification({
        title: 'Error',
        message: 'Failed to add tags to files',
        color: 'red',
      });
    }
  };

  const from = (page - 1) * perpage + 1;
  const to = Math.min(page * perpage, data?.total ?? 0);
  const totalRecords = data?.total ?? 0;
  return (
    <>
      <Group justify='space-between' mb='md' mt='md'>
        <Group>
          <Tooltip label={favoritesOnly ? 'Show all files' : 'Show only favorite files'}>
            <ActionIcon
              variant={favoritesOnly ? 'filled' : 'outline'}
              color={favoritesOnly ? 'red' : 'gray'}
              size='lg'
              onClick={() => setFavoritesOnly(!favoritesOnly)}
            >
              {favoritesOnly ? <IconHeartFilled size='1.2rem' /> : <IconHeart size='1.2rem' />}
            </ActionIcon>
          </Tooltip>
        </Group>

        <Group>
          {selectionMode && (
            <>
              <Button
                variant='subtle'
                size='xs'
                leftSection={<IconX size='0.8rem' />}
                onClick={handleDeselectAll}
              >
                Deselect All
              </Button>
              <Button
                variant='subtle'
                size='xs'
                leftSection={<IconSelectAll size='0.8rem' />}
                onClick={handleSelectAll}
              >
                Select All
              </Button>
              {selectedFiles.size > 0 && (
                <Menu>
                  <Menu.Target>
                    <Button variant='light' size='sm'>
                      Actions ({selectedFiles.size})
                    </Button>
                  </Menu.Target>
                  <Menu.Dropdown>
                    <Menu.Item leftSection={<IconTrash size='1rem' />} color='red' onClick={handleBulkDelete}>
                      Delete Selected
                    </Menu.Item>
                    <Menu.Item leftSection={<IconHeart size='1rem' />} onClick={handleBulkFavorite}>
                      Add to Favorites
                    </Menu.Item>
                    <Menu.Item leftSection={<IconTags size='1rem' />} onClick={() => setTagModalOpened(true)}>
                      Add Tags
                    </Menu.Item>
                    <Menu.Item
                      leftSection={<IconFolder size='1rem' />}
                      onClick={() => setFolderModalOpened(true)}
                    >
                      Move to Folder
                    </Menu.Item>
                  </Menu.Dropdown>
                </Menu>
              )}
            </>
          )}

          <Button
            variant={selectionMode ? 'filled' : 'outline'}
            size='sm'
            leftSection={<IconSelect size='1rem' />}
            onClick={() => {
              setSelectionMode(!selectionMode);
              if (selectionMode) {
                setSelectedFiles(new Set());
              }
            }}
          >
            {selectionMode ? 'Exit Selection' : 'Select Files'}
          </Button>
        </Group>
      </Group>

      <div>
        {isLoading ? (
          <div
            className='masonry-container'
            style={{
              columns: '5',
              columnGap: '1rem',
              margin: '1rem 0',
            }}
          >
            {[...Array(9)].map((_, i) => (
              <Skeleton key={i} height={350} animate />
            ))}
          </div>
        ) : (data?.page?.length ?? 0 > 0) ? (
          <div
            className='masonry-container'
            style={{
              columns: '5',
              columnGap: '1rem',
              margin: '1rem 0',
            }}
          >
            {data?.page.map((file) => (
              <DashboardFile
                key={file.id}
                file={file}
                selectionMode={selectionMode}
                selected={selectedFiles.has(file.id)}
                onSelect={(selected) => handleFileSelect(file.id, selected)}
              />
            ))}
          </div>
        ) : (
          <Center my='xl' py='xl'>
            <Paper withBorder p='xl' radius='md' style={{ maxWidth: 400, width: '100%' }}>
              <Stack align='center' gap='md'>
                <div style={{ color: 'var(--mantine-color-dimmed)' }}>
                  {favoritesOnly ? <IconHeart size='3rem' /> : <IconFilesOff size='3rem' />}
                </div>
                <Title order={3} ta='center' c='dimmed'>
                  {favoritesOnly ? 'No favorite files found' : 'No files found'}
                </Title>
                {!id && !favoritesOnly && (
                  <Button
                    variant='outline'
                    size='sm'
                    leftSection={<IconFileUpload size='1rem' />}
                    component={Link}
                    href='/dashboard/upload/file'
                  >
                    Upload your first file
                  </Button>
                )}
                {favoritesOnly && (
                  <Text size='sm' c='dimmed' ta='center' style={{ lineHeight: 1.5 }}>
                    Click the heart icon above to show all files, or add some files to favorites first.
                  </Text>
                )}
              </Stack>
            </Paper>
          </Center>
        )}
      </div>

      <Group justify='space-between' align='center' mt='md'>
        <Text size='sm'>{`${from} - ${to} / ${totalRecords} files`}</Text>

        <Group gap='sm'>
          <Select
            value={perpage.toString()}
            data={PER_PAGE_OPTIONS.map((val) => ({ value: val.toString(), label: `${val}` }))}
            onChange={(value) => {
              setPerpage(Number(value));
              setPage(1);
            }}
            w={80}
            size='xs'
            variant='filled'
          />

          <Pagination value={page} onChange={setPage} total={cachedPages} size='sm' withControls withEdges />
        </Group>
      </Group>

      <FolderSelectModal
        opened={folderModalOpened}
        onClose={() => setFolderModalOpened(false)}
        onSelect={handleMoveToFolder}
        loading={movingToFolder}
        selectedCount={selectedFiles.size}
      />

      <TagSelectModal
        opened={tagModalOpened}
        onClose={() => setTagModalOpened(false)}
        onConfirm={handleAddTags}
        selectedCount={selectedFiles.size}
        title='Add Tags to Files'
        confirmText='Add Tags'
      />
    </>
  );
}
