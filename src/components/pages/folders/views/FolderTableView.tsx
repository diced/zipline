import RelativeDate from '@/components/RelativeDate';
import { Response } from '@/lib/api/response';
import { Folder } from '@/lib/db/models/folder';
import { ActionIcon, Badge, Box, Checkbox, Group, Menu, Text, Tooltip } from '@mantine/core';
import { useClipboard } from '@mantine/hooks';
import {
  IconCopy,
  IconDots,
  IconFileZip,
  IconFolder,
  IconFolderOpen,
  IconFolderSymlink,
  IconLock,
  IconLockOpen,
  IconPencil,
  IconShare,
  IconShareOff,
  IconTrashFilled,
} from '@tabler/icons-react';
import { DataTable, DataTableSortStatus } from 'mantine-datatable';
import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { copyFolderUrl, editFolderUploads, editFolderVisibility } from '../actions';
import DeleteFolderModal from '../modals/DeleteFolderModal';
import EditFolderNameModal from '../modals/EditFolderNameModal';
import MoveFolderModal from '../modals/MoveFolderModal';
import ViewFilesModal from '../modals/ViewFilesModal';

export const withoutPropagation = (fn: () => void) => (e: React.MouseEvent) => {
  e.stopPropagation();
  fn();
};

function FolderDotsMenu({
  folder,
  onNavigate,
  setDeleteOpen,
  setMoveOpen,
  setEditNameOpen,
}: {
  folder: Folder;
  onNavigate: (folderId: string) => void;
  setDeleteOpen: (folder: Folder) => void;
  setMoveOpen: (folder: Folder) => void;
  setEditNameOpen: (folder: Folder) => void;
}) {
  const [opened, setOpened] = useState(false);

  return (
    <Menu shadow='md' width={200} opened={opened} onChange={setOpened}>
      <Menu.Target>
        <Tooltip label='More actions'>
          <ActionIcon onClick={withoutPropagation(() => setOpened((o) => !o))}>
            <IconDots size='1rem' />
          </ActionIcon>
        </Tooltip>
      </Menu.Target>

      <Menu.Dropdown>
        {onNavigate && (
          <Menu.Item
            leftSection={<IconFolderOpen size='1rem' />}
            onClick={withoutPropagation(() => onNavigate(folder.id!))}
          >
            Open Folder
          </Menu.Item>
        )}
        <Menu.Item
          leftSection={<IconFolderSymlink size='1rem' />}
          onClick={withoutPropagation(() => setMoveOpen(folder))}
        >
          Move Folder
        </Menu.Item>
        <Menu.Item
          leftSection={<IconFileZip size='1rem' />}
          component='a'
          href={`/api/user/folders/${folder.id}/export`}
          target='_blank'
          onClick={withoutPropagation(() => {})}
        >
          Export as ZIP
        </Menu.Item>
        <Menu.Item
          leftSection={folder.public ? <IconLock size='1rem' /> : <IconLockOpen size='1rem' />}
          onClick={withoutPropagation(() => editFolderVisibility(folder, !folder.public))}
        >
          {folder.public ? 'Make Private' : 'Make Public'}
        </Menu.Item>
        <Menu.Item
          leftSection={folder.public ? <IconShareOff size='1rem' /> : <IconShare size='1rem' />}
          onClick={withoutPropagation(() => editFolderUploads(folder, !folder.allowUploads))}
        >
          {folder.allowUploads ? 'Disallow anonymous uploads' : 'Allow anonymous uploads'}
        </Menu.Item>
        <Menu.Item
          leftSection={<IconPencil size='1rem' />}
          onClick={withoutPropagation(() => setEditNameOpen(folder))}
        >
          Edit Name
        </Menu.Item>
        <Menu.Item
          leftSection={<IconTrashFilled size='1rem' />}
          color='red'
          onClick={withoutPropagation(() => setDeleteOpen(folder))}
        >
          Delete
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}

export default function FolderTableView({
  currentFolderId,
  onNavigate,
}: {
  currentFolderId: string | null;
  onNavigate: (folderId: string | null) => void;
}) {
  const clipboard = useClipboard();

  const queryParam = currentFolderId ? `?parentId=${currentFolderId}&noincl=true` : '?root=true&noincl=true';
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
  const [deleteOpen, setDeleteOpen] = useState<Folder | null>(null);

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

      <MoveFolderModal opened={!!moveOpen} folder={moveOpen} onClose={() => setMoveOpen(null)} />

      <DeleteFolderModal opened={!!deleteOpen} folder={deleteOpen} onClose={() => setDeleteOpen(null)} />

      <Box my='sm'>
        <DataTable
          withTableBorder
          minHeight={200}
          records={sorted ?? []}
          onRowClick={({ record }) => onNavigate(record.id)}
          rowStyle={() => ({ cursor: 'pointer' })}
          noRecordsText='No subfolders'
          columns={[
            {
              accessor: 'name',
              sortable: true,
              render: (folder) => (
                <Group gap='xs'>
                  <IconFolder size='1rem' />
                  <Text>{folder.name}</Text>
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
                  <FolderDotsMenu
                    folder={folder}
                    onNavigate={onNavigate}
                    setDeleteOpen={setDeleteOpen}
                    setMoveOpen={setMoveOpen}
                    setEditNameOpen={setEditNameOpen}
                  />

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
                  <Tooltip label='Delete Folder'>
                    <ActionIcon
                      color='red'
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteOpen(folder);
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
