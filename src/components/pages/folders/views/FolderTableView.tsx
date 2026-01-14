import RelativeDate from '@/components/RelativeDate';
import { Response } from '@/lib/api/response';
import { Folder } from '@/lib/db/models/folder';
import { ActionIcon, Anchor, Badge, Box, Checkbox, Group, Tooltip } from '@mantine/core';
import { useClipboard } from '@mantine/hooks';
import {
  IconCopy,
  IconFiles,
  IconFolder,
  IconFolderOpen,
  IconFolderSymlink,
  IconLock,
  IconLockOpen,
  IconPencil,
  IconShare,
  IconShareOff,
  IconTrashFilled,
  IconZip,
} from '@tabler/icons-react';
import { DataTable, DataTableSortStatus } from 'mantine-datatable';
import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { copyFolderUrl, deleteFolder, editFolderUploads, editFolderVisibility } from '../actions';
import EditFolderNameModal from '../EditFolderNameModal';
import MoveFolderModal from '../MoveFolderModal';
import ViewFilesModal from '../ViewFilesModal';

interface FolderTableViewProps {
  currentFolderId: string | null;
  onNavigate: (folderId: string | null) => void;
}

export default function FolderTableView({ currentFolderId, onNavigate }: FolderTableViewProps) {
  const clipboard = useClipboard();

  const queryParam = currentFolderId ? `?parentId=${currentFolderId}` : '?root=true';
  const { data, isLoading } = useSWR<Extract<Response['/api/user/folders'], Folder[]>>(
    `/api/user/folders${queryParam}`,
  );

  const [sortStatus, setSortStatus] = useState<DataTableSortStatus>({
    columnAccessor: 'createdAt',
    direction: 'desc',
  });
  const [selectedFolder, setSelectedFolder] = useState<Folder | null>(null);
  const [editNameOpen, setEditNameOpen] = useState<Folder | null>(null);
  const [moveOpen, setMoveOpen] = useState<Folder | null>(null);

  const sorted = useMemo<Folder[]>(() => {
    if (!data) return [];

    const { columnAccessor, direction } = sortStatus;
    const key = columnAccessor as keyof Folder;

    return [...data].sort((a, b) => {
      const av = a[key]!;
      const bv = b[key]!;

      if (av === bv) return 0;
      return direction === 'asc' ? (av > bv ? 1 : -1) : av < bv ? 1 : -1;
    });
  }, [data, sortStatus]);

  return (
    <>
      <ViewFilesModal
        opened={!!selectedFolder}
        onClose={() => setSelectedFolder(null)}
        folder={selectedFolder}
      />

      <EditFolderNameModal
        opened={!!editNameOpen}
        folder={editNameOpen}
        onClose={() => setEditNameOpen(null)}
      />

      <MoveFolderModal opened={!!moveOpen} folder={moveOpen!} onClose={() => setMoveOpen(null)} />

      <Box my='sm'>
        <DataTable
          borderRadius='sm'
          withTableBorder
          minHeight={200}
          records={sorted ?? []}
          onRowClick={({ record }) => onNavigate(record.id)}
          rowStyle={() => ({ cursor: 'pointer' })}
          columns={[
            {
              accessor: 'name',
              sortable: true,
              render: (folder) => (
                <Group gap='xs'>
                  <IconFolder size='1rem' />
                  {folder.public ? (
                    <Anchor
                      href={`/folder/${folder.id}`}
                      target='_blank'
                      onClick={(e) => e.stopPropagation()}
                    >
                      {folder.name}
                    </Anchor>
                  ) : (
                    folder.name
                  )}
                  {(folder._count?.children ?? 0) > 0 && (
                    <Badge size='xs' variant='light'>
                      {folder._count?.children} subfolder{(folder._count?.children ?? 0) > 1 ? 's' : ''}
                    </Badge>
                  )}
                </Group>
              ),
            },
            {
              accessor: 'public',
              sortable: true,
              render: (folder) => <Checkbox checked={folder.public} readOnly />,
            },
            {
              accessor: 'allowUploads',
              title: 'Uploads?',
              sortable: true,
              render: (folder) => <Checkbox checked={folder.allowUploads} readOnly />,
            },
            {
              accessor: 'createdAt',
              title: 'Created',
              sortable: true,
              render: (folder) => <RelativeDate date={folder.createdAt} />,
            },
            {
              accessor: 'updatedAt',
              title: 'Last update at',
              sortable: true,
              render: (folder) => <RelativeDate date={folder.updatedAt} />,
            },
            {
              accessor: 'actions',
              textAlign: 'right',
              render: (folder) => (
                <Group gap='sm' justify='right' wrap='nowrap'>
                  <Tooltip label='Open folder'>
                    <ActionIcon
                      onClick={(e) => {
                        e.stopPropagation();
                        onNavigate(folder.id);
                      }}
                    >
                      <IconFolderOpen size='1rem' />
                    </ActionIcon>
                  </Tooltip>
                  <Tooltip label='View files'>
                    <ActionIcon
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedFolder(folder);
                      }}
                    >
                      <IconFiles size='1rem' />
                    </ActionIcon>
                  </Tooltip>
                  <Tooltip label='Move folder'>
                    <ActionIcon
                      onClick={(e) => {
                        e.stopPropagation();
                        setMoveOpen(folder);
                      }}
                    >
                      <IconFolderSymlink size='1rem' />
                    </ActionIcon>
                  </Tooltip>
                  <Tooltip label='Copy folder link'>
                    <ActionIcon
                      onClick={(e) => {
                        e.stopPropagation();
                        copyFolderUrl(folder, clipboard);
                      }}
                      disabled={!folder.public}
                    >
                      <IconCopy size='1rem' />
                    </ActionIcon>
                  </Tooltip>
                  <Tooltip label={folder.public ? 'Make private' : 'Make public'}>
                    <ActionIcon
                      color={folder.public ? 'blue' : 'gray'}
                      onClick={(e) => {
                        e.stopPropagation();
                        editFolderVisibility(folder, !folder.public);
                      }}
                    >
                      {folder.public ? <IconLockOpen size='1rem' /> : <IconLock size='1rem' />}
                    </ActionIcon>
                  </Tooltip>
                  <Tooltip
                    label={folder.allowUploads ? 'Disable anonymous uploads' : 'Allow anonymous uploads'}
                  >
                    <ActionIcon
                      color={folder.allowUploads ? 'blue' : 'gray'}
                      onClick={(e) => {
                        e.stopPropagation();
                        editFolderUploads(folder, !folder.allowUploads);
                      }}
                    >
                      {folder.allowUploads ? <IconShareOff size='1rem' /> : <IconShare size='1rem' />}
                    </ActionIcon>
                  </Tooltip>
                  <Tooltip label='Edit Folder Name'>
                    <ActionIcon
                      color='blue'
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditNameOpen(folder);
                      }}
                    >
                      <IconPencil size='1rem' />
                    </ActionIcon>
                  </Tooltip>
                  <Tooltip label='Export folder as ZIP'>
                    <ActionIcon
                      color='blue'
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(`/api/user/folders/${folder.id}/export`, '_blank');
                      }}
                    >
                      <IconZip size='1rem' />
                    </ActionIcon>
                  </Tooltip>
                  <Tooltip label='Delete Folder'>
                    <ActionIcon
                      color='red'
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteFolder(folder);
                      }}
                    >
                      <IconTrashFilled size='1rem' />
                    </ActionIcon>
                  </Tooltip>
                </Group>
              ),
            },
          ]}
          fetching={isLoading}
          sortStatus={sortStatus}
          onSortStatusChange={(s) => setSortStatus(s as unknown as any)}
        />
      </Box>
    </>
  );
}
