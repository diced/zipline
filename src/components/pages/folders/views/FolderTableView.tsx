import { useConfig } from '@/components/ConfigProvider';
import RelativeDate from '@/components/RelativeDate';
import { Response } from '@/lib/api/response';
import { Folder } from '@/lib/db/models/folder';
import { ActionIcon, Box, Group, Tooltip } from '@mantine/core';
import { useClipboard } from '@mantine/hooks';
import { DataTable, DataTableSortStatus } from 'mantine-datatable';
import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { copyFolderUrl, deleteFolder, editFolderVisibility } from '../actions';
import { IconCopy, IconFiles, IconLock, IconLockOpen, IconTrashFilled } from '@tabler/icons-react';
import ViewFilesModal from '../ViewFilesModal';

export default function FolderTableView() {
  const config = useConfig();
  const clipboard = useClipboard();

  const { data, isLoading } = useSWR<Extract<Response['/api/user/folders'], Folder[]>>('/api/user/folders');

  const [sortStatus, setSortStatus] = useState<DataTableSortStatus>({
    columnAccessor: 'createdAt',
    direction: 'desc',
  });
  const [sorted, setSorted] = useState<Folder[]>(data ?? []);
  const [selectedFolder, setSelectedFolder] = useState<Folder | null>(null);

  useEffect(() => {
    if (data) {
      const sorted = data.sort((a, b) => {
        const cl = sortStatus.columnAccessor as keyof Folder;

        return sortStatus.direction === 'asc' ? (a[cl]! > b[cl]! ? 1 : -1) : a[cl]! < b[cl]! ? 1 : -1;
      });

      setSorted(sorted);
    }
  }, [sortStatus]);

  useEffect(() => {
    if (data) {
      setSorted(data);
    }
  }, [data]);

  return (
    <>
      <ViewFilesModal
        opened={!!selectedFolder}
        onClose={() => setSelectedFolder(null)}
        folder={selectedFolder}
      />

      <Box my='sm'>
        <DataTable
          borderRadius='sm'
          withBorder
          minHeight={200}
          records={sorted ?? []}
          columns={[
            {
              accessor: 'name',
              sortable: true,
            },
            {
              accessor: 'public',
              sortable: true,
              render: (folder) => (folder.public ? 'Yes' : 'No'),
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
              width: 170,
              render: (folder) => (
                <Group spacing='sm'>
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
                  <Tooltip label='Copy folder link'>
                    <ActionIcon
                      onClick={(e) => {
                        e.stopPropagation();
                        copyFolderUrl(folder, clipboard);
                      }}
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
          onSortStatusChange={(s) => setSortStatus(s)}
        />
      </Box>
    </>
  );
}
