import DashboardFile from '@/components/file/DashboardFile';
import { addMultipleToFolder, createZipShare, deleteMultipleFiles } from '@/components/file/actions';
import FolderSelectModal from '@/components/folders/FolderSelectModal';
import { useFileNavStore } from '@/lib/client/store/fileNav';
import {
  Button,
  Center,
  Group,
  Modal,
  Pagination,
  Paper,
  Select,
  Skeleton,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { useClipboard } from '@mantine/hooks';
import { modals } from '@mantine/modals';
import { IconFilesOff, IconFileUpload, IconFolder, IconTrash, IconArchive } from '@tabler/icons-react';
import { parseAsInteger, useQueryState } from 'nuqs';
import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  forwardRef,
} from 'react';
import { Link } from 'react-router-dom';
import { useShallow } from 'zustand/shallow';
import { useApiPagination } from '../useApiPagination';
import { useInfiniteFiles } from '../useInfiniteFiles';
import { useViewStore } from '@/lib/client/store/view';
import { getGridSkeletonHeight } from '@/components/GridTableSwitcher';
import { File } from '@/lib/db/models/file';
import styles from './FilesGridView.module.css';

const DashboardFileModal = lazy(() => import('@/components/file/DashboardFile/DashboardFileModal'));

const PER_PAGE_OPTIONS = [12, 24, 36, 48, 72, 96];

export type FilesGridViewRef = { refresh: () => void };

export default forwardRef<
  FilesGridViewRef,
  {
    id?: string;
    folderId?: string;
    search?: string;
    infinite?: boolean;
  }
>(function Files({ id, folderId, search, infinite }, ref) {
  const gridSize = useViewStore((state) => state.filesGridSize);
  const [page, setPage] = useQueryState('page', parseAsInteger.withDefault(1));
  const [perpage, setPerpage] = useQueryState('perpage', parseAsInteger.withDefault(24));

  const paginationQuery = useApiPagination({
    page,
    perpage,
    id,
    folderId,
    ...(search?.trim() && {
      search: {
        field: 'name',
        query: search.trim(),
      },
    }),
  });

  const infiniteQuery = useInfiniteFiles({
    perpage,
    id,
    folderId,
    ...(search?.trim() && {
      search: {
        field: 'name',
        query: search.trim(),
      },
    }),
  });

  useImperativeHandle(ref, () => ({
    refresh,
  }));

  useEffect(() => {
    if (infinite) {
      infiniteQuery.reset();
    } else {
      setPage(1);
    }
  }, [search, folderId, perpage, infinite, setPage]);

  const refresh = useCallback(() => {
    if (infinite) {
      infiniteQuery.mutate();
    } else {
      paginationQuery.mutate();
    }
  }, [infinite, infiniteQuery, paginationQuery]);

  const data = infinite ? infiniteQuery.data : ((paginationQuery.data?.page as File[] | undefined) ?? []);
  const isLoading = infinite ? infiniteQuery.isLoading : paginationQuery.isLoading;
  const totalRecords = infinite ? infiniteQuery.totalRecords : (paginationQuery.data?.total ?? 0);
  const cachedPages = infinite ? infiniteQuery.totalPages : (paginationQuery.data?.pages ?? 1);

  const [current, setCurrent, setFiles] = useFileNavStore(
    useShallow((state) => [state.current, state.setCurrent, state.setFiles]),
  );

  const from = infinite ? 1 : (page - 1) * perpage + 1;
  const to = infinite ? data.length : Math.min(page * perpage, paginationQuery.data?.total ?? 0);

  const currentFile = current ? (data.find((file) => file.id === current) ?? null) : null;
  const ids = useMemo(() => data.map((file) => file.id), [data]);

  useEffect(() => {
    setFiles(ids);
  }, [ids]);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [zipModalOpen, setZipModalOpen] = useState(false);
  const [zipName, setZipName] = useState('archive.zip');
  const clipboard = useClipboard();

  const selectedFiles = useMemo(() => data.filter((file) => selectedIds.has(file.id)), [data, selectedIds]);

  useEffect(() => {
    setSelectedIds(new Set());
  }, [search, folderId, page, infinite]);

  const handleSelect = useCallback(
    (fileId: string) => {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(fileId)) next.delete(fileId);
        else next.add(fileId);
        return next;
      });
    },
    [setSelectedIds],
  );

  const handleClear = useCallback(() => setSelectedIds(new Set()), []);

  const handleMove = useCallback(() => {
    const modalId = modals.open({
      title: 'Move to folder',
      size: 'lg',
      centered: true,
      children: (
        <FolderSelectModal
          allowNoFolder={false}
          confirmLabel='Move'
          onSelect={async (folderId) => {
            if (folderId === undefined) return;
            await addMultipleToFolder(selectedFiles, folderId);
            modals.close(modalId);
            handleClear();
            refresh();
          }}
          onCancel={() => modals.close(modalId)}
        />
      ),
      onClose: () => modals.close(modalId),
    });
  }, [selectedFiles, handleClear, refresh]);

  const handleDelete = useCallback(async () => {
    await deleteMultipleFiles(selectedFiles);
    handleClear();
    refresh();
  }, [selectedFiles, handleClear, refresh]);

  const handleZip = useCallback(async () => {
    const name = zipName.trim() || 'archive.zip';
    const url = await createZipShare(selectedFiles, name.endsWith('.zip') ? name : `${name}.zip`);
    if (url) {
      clipboard.copy(url);
      setZipModalOpen(false);
      handleClear();
      refresh();
    }
  }, [selectedFiles, zipName, clipboard, handleClear, refresh]);

  const skeletonHeight = getGridSkeletonHeight(gridSize);
  const itemCount = perpage;
  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!infinite || !loadMoreRef.current) return;
    if (!('IntersectionObserver' in window)) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && infiniteQuery.hasMore && !infiniteQuery.isLoadingMore) {
          infiniteQuery.loadMore();
        }
      },
      { rootMargin: '400px' },
    );

    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [infinite, infiniteQuery.hasMore, infiniteQuery.isLoadingMore, infiniteQuery.loadMore]);

  const gridClass = [
    styles.masonry,
    gridSize === 'compact' && styles.compact,
    gridSize === 'large' && styles.large,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <>
      <DashboardFileModal
        open={!!currentFile}
        setOpen={(open) => {
          if (!open) setCurrent(null);
        }}
        file={currentFile}
        user={id}
        sequenced
        onDelete={refresh}
      />

      {selectedIds.size > 0 && (
        <Paper withBorder p='sm' mb='md'>
          <Group justify='space-between' align='center' wrap='nowrap'>
            <Text size='sm' fw={600}>
              {selectedIds.size} selected
            </Text>

            <Group gap='xs'>
              <Button
                size='compact-sm'
                variant='light'
                leftSection={<IconFolder size='1rem' />}
                onClick={handleMove}
              >
                Move
              </Button>
              <Button
                size='compact-sm'
                variant='light'
                color='red'
                leftSection={<IconTrash size='1rem' />}
                onClick={handleDelete}
              >
                Delete
              </Button>
              <Button
                size='compact-sm'
                variant='light'
                color='teal'
                leftSection={<IconArchive size='1rem' />}
                onClick={() => setZipModalOpen(true)}
              >
                Zip & Share
              </Button>
              <Button size='compact-sm' variant='subtle' onClick={handleClear}>
                Clear
              </Button>
            </Group>
          </Group>
        </Paper>
      )}

      <Modal opened={zipModalOpen} onClose={() => setZipModalOpen(false)} title='Zip & share' centered>
        <Stack>
          <Text size='sm' c='dimmed'>
            Create a zip archive from {selectedIds.size} selected file(s) and generate a shareable link. Saved
            to the &ldquo;zip shares&rdquo; folder.
          </Text>
          <TextInput
            label='Zip file name'
            description='Will be saved as a regular .zip file.'
            value={zipName}
            onChange={(e) => setZipName(e.currentTarget.value)}
            placeholder='my-files.zip'
          />
          <Group justify='right' mt='md'>
            <Button variant='default' onClick={() => setZipModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleZip} leftSection={<IconArchive size='1rem' />}>
              Create & copy link
            </Button>
          </Group>
        </Stack>
      </Modal>

      <div className={gridClass}>
        {isLoading ? (
          [...Array(itemCount)].map((_, i) => (
            <Skeleton key={i} height={skeletonHeight} radius='md' animate />
          ))
        ) : data.length > 0 ? (
          data.map((file) => (
            <Suspense fallback={<Skeleton height={skeletonHeight} radius='md' animate />} key={file.id}>
              <DashboardFile
                file={file}
                id={id}
                onOpen={(fileId) => setCurrent(fileId)}
                onDelete={refresh}
                selected={selectedIds.has(file.id)}
                onSelect={() => handleSelect(file.id)}
                compact={gridSize === 'compact'}
              />
            </Suspense>
          ))
        ) : (
          <Paper withBorder p='sm' className={styles.empty}>
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
                    to='/dashboard/upload/file'
                  >
                    Upload a file
                  </Button>
                )}
              </Stack>
            </Center>
          </Paper>
        )}
      </div>

      {infinite ? (
        <div ref={loadMoreRef} style={{ minHeight: 1 }}>
          <Group justify='space-between' align='center' mt='md'>
            <Text size='sm'>{`${data.length} / ${totalRecords} files`}</Text>

            {infiniteQuery.isLoadingMore ? (
              <Text size='sm' c='dimmed'>
                Loading more...
              </Text>
            ) : infiniteQuery.hasMore ? (
              <Text size='sm' c='dimmed'>
                Scroll to load more
              </Text>
            ) : (
              <Text size='sm' c='dimmed'>
                All files loaded
              </Text>
            )}
          </Group>
        </div>
      ) : (
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

            <Pagination
              value={page}
              onChange={setPage}
              total={cachedPages}
              size='sm'
              withControls
              withEdges
            />
          </Group>
        </Group>
      )}
    </>
  );
});
