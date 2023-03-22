import { ActionIcon, Avatar, Card, Group, SimpleGrid, Skeleton, Stack, Title, Tooltip } from '@mantine/core';
import { useClipboard } from '@mantine/hooks';
import { useModals } from '@mantine/modals';
import { showNotification } from '@mantine/notifications';
import {
  IconClipboardCheck,
  IconClipboardCopy,
  IconExternalLink,
  IconFiles,
  IconFolderMinus,
  IconFolderPlus,
  IconFolderX,
  IconGridDots,
  IconList,
  IconLock,
  IconLockAccessOff,
  IconLockOpen,
} from '@tabler/icons-react';
import AnchorNext from 'components/AnchorNext';
import MutedText from 'components/MutedText';
import useFetch from 'hooks/useFetch';
import { useFolders } from 'lib/queries/folders';
import { listViewFoldersSelector } from 'lib/recoil/settings';
import { relativeTime } from 'lib/utils/client';
import { DataTable, DataTableSortStatus } from 'mantine-datatable';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { useRecoilState } from 'recoil';
import CreateFolderModal from './CreateFolderModal';
import ViewFolderFilesModal from './ViewFolderFilesModal';

export default function Folders({ disableMediaPreview, exifEnabled, compress }) {
  const folders = useFolders();
  const [createOpen, setCreateOpen] = useState(false);
  const [createWithFile, setCreateWithFile] = useState(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [activeFolderId, setActiveFolderId] = useState(null);

  const modals = useModals();
  const clipboard = useClipboard();
  const router = useRouter();

  const [listView, setListView] = useRecoilState(listViewFoldersSelector);

  const [sortStatus, setSortStatus] = useState<DataTableSortStatus>({
    columnAccessor: 'updatedAt',
    direction: 'desc',
  });
  const [records, setRecords] = useState(folders.data);

  useEffect(() => {
    setRecords(folders.data);
  }, [folders.data]);

  useEffect(() => {
    if (!records || records.length === 0) return;

    const sortedRecords = [...records].sort((a, b) => {
      if (sortStatus.direction === 'asc') {
        return a[sortStatus.columnAccessor] > b[sortStatus.columnAccessor] ? 1 : -1;
      }

      return a[sortStatus.columnAccessor] < b[sortStatus.columnAccessor] ? 1 : -1;
    });

    setRecords(sortedRecords);
  }, [sortStatus]);

  useEffect(() => {
    if (router.query.create) {
      setCreateOpen(true);
      setCreateWithFile(router.query.create);
    }
  }, []);

  const deleteFolder = (folder) => {
    modals.openConfirmModal({
      title: <Title>Delete folder {folder.name}?</Title>,
      children:
        'Are you sure you want to delete this folder? All files within the folder will still exist, but will no longer be in a folder.',
      labels: {
        confirm: 'Delete',
        cancel: 'Cancel',
      },
      onConfirm: async () => {
        const res = await useFetch(`/api/user/folders/${folder.id}`, 'DELETE', {
          deleteFolder: true,
        });

        if (!res.error) {
          showNotification({
            title: 'Deleted folder',
            message: `Deleted folder ${folder.name}`,
            color: 'green',
            icon: <IconFolderMinus size='1rem' />,
          });
          folders.refetch();
        } else {
          showNotification({
            title: 'Failed to delete folder',
            message: res.error,
            color: 'red',
            icon: <IconFolderX size='1rem' />,
          });
          folders.refetch();
        }
      },
    });
  };

  const makePublic = async (folder) => {
    const res = await useFetch(`/api/user/folders/${folder.id}`, 'PATCH', {
      public: folder.public ? false : true,
    });

    if (!res.error) {
      showNotification({
        title: 'Made folder public',
        message: `Made folder ${folder.name} ${folder.public ? 'private' : 'public'}`,
        color: 'green',
        icon: <IconLockOpen size='1rem' />,
      });
      folders.refetch();
    } else {
      showNotification({
        title: 'Failed to make folder public/private',
        message: res.error,
        color: 'red',
        icon: <IconLockAccessOff size='1rem' />,
      });
      folders.refetch();
    }
  };

  return (
    <>
      <CreateFolderModal
        open={createOpen}
        setOpen={setCreateOpen}
        createWithFile={createWithFile}
        updateFolders={folders.refetch}
      />
      <ViewFolderFilesModal
        open={viewOpen}
        setOpen={setViewOpen}
        folderId={activeFolderId}
        disableMediaPreview={disableMediaPreview}
        exifEnabled={exifEnabled}
        compress={compress}
      />

      <Group mb='md'>
        <Title>Folders</Title>
        <ActionIcon onClick={() => setCreateOpen(!createOpen)} component='a' variant='filled' color='primary'>
          <IconFolderPlus size='1rem' />
        </ActionIcon>
        <Tooltip label={listView ? 'Switch to grid view' : 'Switch to list view'}>
          <ActionIcon variant='filled' color='primary' onClick={() => setListView(!listView)}>
            {listView ? <IconList size='1rem' /> : <IconGridDots size='1rem' />}
          </ActionIcon>
        </Tooltip>
      </Group>

      {listView ? (
        <DataTable
          withBorder
          borderRadius='md'
          highlightOnHover
          verticalSpacing='sm'
          columns={[
            { accessor: 'id', title: 'ID', sortable: true },
            { accessor: 'name', sortable: true },

            {
              accessor: 'public',
              sortable: true,
              render: (folder) => (folder.public ? 'Public' : 'Private'),
            },
            {
              accessor: 'createdAt',
              title: 'Created',
              sortable: true,
              render: (folder) => new Date(folder.createdAt).toLocaleString(),
            },
            {
              accessor: 'updatedAt',
              title: 'Last updated',
              sortable: true,
              render: (folder) => new Date(folder.updatedAt).toLocaleString(),
            },
            {
              accessor: 'actions',
              textAlignment: 'right',
              render: (folder) => (
                <Group spacing={4} position='right' noWrap>
                  <Tooltip label='View files in folder'>
                    <ActionIcon
                      onClick={() => {
                        setViewOpen(true);
                        setActiveFolderId(folder.id);
                      }}
                      variant='subtle'
                      color='primary'
                    >
                      <IconFiles size='1rem' />
                    </ActionIcon>
                  </Tooltip>
                  <Tooltip label={folder.public ? 'Make folder private' : 'Make folder public'}>
                    <ActionIcon onClick={() => makePublic(folder)} variant='subtle' color='primary'>
                      {folder.public ? <IconLockOpen size='1rem' /> : <IconLock size='1rem' />}
                    </ActionIcon>
                  </Tooltip>
                  <Tooltip label='Open folder in new tab'>
                    <ActionIcon
                      onClick={() => window.open(`/folder/${folder.id}`, '_blank')}
                      variant='subtle'
                      color='primary'
                    >
                      <IconExternalLink size='1rem' />
                    </ActionIcon>
                  </Tooltip>
                  <Tooltip label='Copy folder link'>
                    <ActionIcon
                      onClick={() => {
                        clipboard.copy(`${window.location.origin}/folder/${folder.id}`);
                        showNotification({
                          title: 'Copied folder link',
                          message: 'Copied folder link to clipboard',
                          color: 'green',
                          icon: <IconClipboardCheck size='1rem' />,
                        });
                      }}
                      variant='subtle'
                      color='primary'
                    >
                      <IconClipboardCopy size='1rem' />
                    </ActionIcon>
                  </Tooltip>
                  <Tooltip label='Delete folder'>
                    <ActionIcon onClick={() => deleteFolder(folder)} variant='subtle' color='red'>
                      <IconFolderX size='1rem' />
                    </ActionIcon>
                  </Tooltip>
                </Group>
              ),
            },
          ]}
          sortStatus={sortStatus}
          onSortStatusChange={setSortStatus}
          records={records ?? []}
          fetching={folders.isLoading}
          minHeight={160}
          loaderBackgroundBlur={5}
          loaderVariant='dots'
          rowContextMenu={{
            shadow: 'xl',
            borderRadius: 'md',
            items: (folder) => [
              {
                key: 'viewFiles',
                title: 'View files in folder',
                icon: <IconFiles size='1rem' />,
                onClick: () => {
                  setViewOpen(true);
                  setActiveFolderId(folder.id);
                },
              },
              {
                key: 'makePublic',
                title: folder.public ? 'Make folder private' : 'Make folder public',
                icon: folder.public ? <IconLockOpen size='1rem' /> : <IconLock size='1rem' />,
                onClick: () => makePublic(folder),
              },
              {
                key: 'openFolder',
                title: 'Open folder in a new tab',
                icon: <IconExternalLink size='1rem' />,
                onClick: () => window.open(`/folder/${folder.id}`, '_blank'),
              },
              {
                key: 'copyLink',
                title: 'Copy folder link to clipboard',
                icon: <IconClipboardCopy size='1rem' />,
                onClick: () => {
                  clipboard.copy(`${window.location.origin}/folder/${folder.id}`);
                },
              },
              {
                key: 'deleteFolder',
                title: 'Delete folder',
                icon: <IconFolderX size='1rem' />,
                onClick: () => deleteFolder(folder),
              },
            ],
          }}
        />
      ) : (
        <SimpleGrid cols={3} spacing='lg' breakpoints={[{ maxWidth: 'sm', cols: 1, spacing: 'sm' }]}>
          {folders.isSuccess
            ? folders.data.length
              ? folders.data.map((folder) => (
                  <Card key={folder.id}>
                    <Group position='apart'>
                      <Group position='left'>
                        <Avatar size='lg' color='primary'>
                          {folder.id}
                        </Avatar>
                        <Stack spacing={0}>
                          <Title>{folder.name}</Title>
                          <MutedText size='sm'>ID: {folder.id}</MutedText>
                          <MutedText size='sm'>Public: {folder.public ? 'Yes' : 'No'}</MutedText>
                          <Tooltip label={new Date(folder.createdAt).toLocaleString()}>
                            <div>
                              <MutedText size='sm'>
                                Created {relativeTime(new Date(folder.createdAt))}
                              </MutedText>
                            </div>
                          </Tooltip>
                          <Tooltip label={new Date(folder.updatedAt).toLocaleString()}>
                            <div>
                              <MutedText size='sm'>
                                Last updated {relativeTime(new Date(folder.updatedAt))}
                              </MutedText>
                            </div>
                          </Tooltip>
                        </Stack>
                      </Group>
                      <Group>
                        <Stack>
                          <Tooltip label={folder.public ? 'Make folder private' : 'Make folder public'}>
                            <ActionIcon
                              aria-label={folder.public ? 'make private' : 'make public'}
                              onClick={() => makePublic(folder)}
                            >
                              {folder.public ? <IconLock size='1rem' /> : <IconLockOpen size='1rem' />}
                            </ActionIcon>
                          </Tooltip>
                          <Tooltip label='Delete folder'>
                            <ActionIcon aria-label='delete' onClick={() => deleteFolder(folder)}>
                              <IconFolderMinus size='1rem' />
                            </ActionIcon>
                          </Tooltip>
                        </Stack>
                        <Stack>
                          <ActionIcon
                            aria-label='view files'
                            onClick={() => {
                              setViewOpen(!viewOpen);
                              setActiveFolderId(folder.id);
                            }}
                          >
                            <IconFiles size='1rem' />
                          </ActionIcon>
                          <ActionIcon
                            aria-label='copy link'
                            onClick={() => {
                              clipboard.copy(`${window.location.origin}/folder/${folder.id}`);
                              if (!navigator.clipboard)
                                showNotification({
                                  title: 'Unable to copy to clipboard',
                                  message: 'Zipline is unable to copy to clipboard due to security reasons.',
                                  color: 'red',
                                });
                              else
                                showNotification({
                                  title: 'Copied folder link',
                                  message: (
                                    <>
                                      Copied{' '}
                                      <AnchorNext href={`/folder/${folder.id}`}>folder link</AnchorNext> to
                                      clipboard
                                    </>
                                  ),
                                  color: 'green',
                                  icon: <IconClipboardCopy size='1rem' />,
                                });
                            }}
                          >
                            <IconClipboardCopy size='1rem' />
                          </ActionIcon>
                          <ActionIcon
                            aria-label='open in new tab'
                            onClick={() => window.open(`/folder/${folder.id}`)}
                          >
                            <IconExternalLink size='1rem' />
                          </ActionIcon>
                        </Stack>
                      </Group>
                    </Group>
                  </Card>
                ))
              : null
            : [1, 2, 3, 4].map((x) => (
                <div key={x}>
                  <Skeleton width='100%' height={220} sx={{ borderRadius: 1 }} />
                </div>
              ))}
        </SimpleGrid>
      )}
    </>
  );
}
