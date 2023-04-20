import { ActionIcon, Group, Tooltip } from '@mantine/core';
import { useClipboard } from '@mantine/hooks';
import { showNotification } from '@mantine/notifications';
import {
  IconClipboardCopy,
  IconExternalLink,
  IconFolderShare,
  IconFolderX,
  IconPhotoCancel,
  IconPhotoStar,
  IconPhotoMinus,
} from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { ApiError } from 'hooks/useFetch';
import { DataTable, DataTableSortStatus } from 'mantine-datatable';
import { useFileDelete, useFileFavorite } from 'lib/queries/files';

export default function FileTable({ files }) {

  const [sortStatus, setSortStatus] = useState<DataTableSortStatus>({
    columnAccessor: 'createdAt',
    direction: 'desc',
  });
  const [records, setRecords] = useState(files.data);

  const [open, setOpen] = useState(false);

  const deleteFile = useFileDelete();
  const favoriteFile = useFileFavorite();

  const clipboard = useClipboard();

  useEffect(() => {
    setRecords(files.data);
  }, [files.data]);

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

  const handleCopy = (file) => {
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

  const handleDelete = async (file) => {
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

  const handleFavorite = async (file) => {
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

  return (
    <DataTable
      withBorder
      borderRadius='md'
      highlightOnHover
      verticalSpacing='sm'
      columns={[
        { accessor: 'id', title: 'ID', sortable: true },
        { accessor: 'name', sortable: true },
        { accessor: 'type', sortable: true },
        { accessor: 'views', sortable: true },
        {
          accessor: 'createdAt',
          title: 'Created',
          sortable: true,
          render: (file) => new Date(file.createdAt).toLocaleString(),
        },
        {
          accessor: 'expiresAt',
          title: 'Expires',
          sortable: true,
          render: (file) => new Date(file.expiresAt).toLocaleString(),
        },
        {
          accessor: 'actions',
          textAlignment: 'right',
          render: (file) => (
            <Group spacing={4} position='right' noWrap>
              <Tooltip label={file.favorite ? 'Unfavorite' : 'Favorite'}>
                <ActionIcon
                  color={file.favorite ? 'yellow' : 'gray'}
                  variant='filled'
                  onClick={handleFavorite}
                >
                  <IconPhotoStar size='1rem' />
                </ActionIcon>
              </Tooltip>
              <Tooltip label='Open file in new tab'>
                <ActionIcon
                  onClick={() => window.open(file.url, '_blank')}
                  variant='subtle'
                  color='primary'
                >
                  <IconFolderShare size='1rem' />
                </ActionIcon>
              </Tooltip>
              <Tooltip label='Copy URL'>
                <ActionIcon color='blue' variant='filled' onClick={handleCopy}>
                  <IconClipboardCopy size='1rem' />
                </ActionIcon>
              </Tooltip>
              <Tooltip label='Delete file'>
                <ActionIcon onClick={() => handleDelete(file)} variant='subtle' color='red'>
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
      fetching={files.isLoading}
      loaderBackgroundBlur={5}
      minHeight='calc(100vh - 200px)'
      loaderVariant='dots'
      rowContextMenu={{
        shadow: 'xl',
        borderRadius: 'md',
        items: (file) => [
          {
            key: 'favorite',
            title: file.favorite ? 'Unfavorite' : 'Favorite',
            icon: <IconPhotoStar size='1rem' />,
            onClick: () => handleFavorite(file),
          },
          {
            key: 'openFile',
            title: 'Open file in a new tab',
            icon: <IconExternalLink size='1rem' />,
            onClick: () => window.open(file.url, '_blank'),
          },
          {
            key: 'copyLink',
            title: 'Copy file link to clipboard',
            icon: <IconClipboardCopy size='1rem' />,
            onClick: () => {
              clipboard.copy(file.url);
            },
          },
          {
            key: 'deleteFile',
            title: 'Delete file',
            icon: <IconFolderX size='1rem' />,
            onClick: () => handleDelete(file),
          },
        ],
      }}
      onCellClick={({ column, record: file }) => {
        if (column.accessor === 'actions') return;

        setOpen(true);
      }}
    />
  )
}