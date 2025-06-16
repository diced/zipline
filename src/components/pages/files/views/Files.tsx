import {
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
} from '@mantine/core';
import {
  IconFileUpload,
  IconFilesOff,
  IconTrash,
  IconHeart,
  IconFolder,
  IconSelect,
  IconSelectAll,
  IconX,
} from '@tabler/icons-react';
import { showNotification } from '@mantine/notifications';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { parseAsInteger, useQueryState } from 'nuqs';
import { useEffect, useState } from 'react';
import { useApiPagination } from '../useApiPagination';

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

  const { data, isLoading } = useApiPagination({
    page,
    perpage,
    id,
  });

  useEffect(() => {
    if (data?.pages) {
      setCachedPages(data.pages);
    }
  }, [data?.pages]);

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
        // Refresh the data
        window.location.reload();
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
      }
    } catch {
      showNotification({
        title: 'Error',
        message: 'Failed to add files to favorites',
        color: 'red',
      });
    }
  };

  const from = (page - 1) * perpage + 1;
  const to = Math.min(page * perpage, data?.total ?? 0);
  const totalRecords = data?.total ?? 0;
  return (
    <>
      {/* Selection Controls */}
      <Group justify='space-between' mb='md' mt='md'>
        <Group>
          <Button
            variant={selectionMode ? 'filled' : 'outline'}
            size='sm'
            leftSection={<IconSelect size='1rem' />}
            onClick={() => {
              setSelectionMode(!selectionMode);
              if (selectionMode) {
                // Exiting selection mode - clear all selections
                setSelectedFiles(new Set());
              }
            }}
          >
            {selectionMode ? 'Exit Selection' : 'Select Files'}
          </Button>

          {selectionMode && (
            <Group gap='xs'>
              <Button
                variant='subtle'
                size='xs'
                leftSection={<IconSelectAll size='0.8rem' />}
                onClick={handleSelectAll}
              >
                Select All
              </Button>
              <Button
                variant='subtle'
                size='xs'
                leftSection={<IconX size='0.8rem' />}
                onClick={handleDeselectAll}
              >
                Deselect All
              </Button>
            </Group>
          )}
        </Group>

        {selectionMode && selectedFiles.size > 0 && (
          <Group gap='xs'>
            <Text size='sm' c='dimmed'>
              {selectedFiles.size} selected
            </Text>
            <Menu>
              <Menu.Target>
                <Button variant='light' size='sm'>
                  Actions
                </Button>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Item leftSection={<IconTrash size='1rem' />} color='red' onClick={handleBulkDelete}>
                  Delete Selected
                </Menu.Item>
                <Menu.Item leftSection={<IconHeart size='1rem' />} onClick={handleBulkFavorite}>
                  Add to Favorites
                </Menu.Item>
                <Menu.Item
                  leftSection={<IconFolder size='1rem' />}
                  onClick={() => {
                    showNotification({
                      title: 'Coming Soon',
                      message: 'Folder management feature will be available soon',
                      color: 'blue',
                    });
                  }}
                >
                  Move to Folder
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
        )}
      </Group>

      <div
        className='masonry-container'
        style={{
          columns: '5',
          columnGap: '1rem',
          margin: '1rem 0',
        }}
      >
        {isLoading ? (
          [...Array(9)].map((_, i) => <Skeleton key={i} height={350} animate />)
        ) : (data?.page?.length ?? 0 > 0) ? (
          data?.page.map((file) => (
            <DashboardFile
              key={file.id}
              file={file}
              selectionMode={selectionMode}
              selected={selectedFiles.has(file.id)}
              onSelect={(selected) => handleFileSelect(file.id, selected)}
            />
          ))
        ) : (
          <Paper withBorder p='sm'>
            <Center>
              <Stack>
                <Group>
                  <IconFilesOff size='2rem' />
                  <Title order={2}>No files found</Title>
                </Group>
                {!id && (
                  <Button
                    variant='outline'
                    size='compact-sm'
                    leftSection={<IconFileUpload size='1rem' />}
                    component={Link}
                    href='/dashboard/upload/file'
                  >
                    Upload a file
                  </Button>
                )}
              </Stack>
            </Center>
          </Paper>
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
    </>
  );
}
