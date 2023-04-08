import { ActionIcon, Box, Group, Title, Tooltip } from '@mantine/core';
import { useClipboard } from '@mantine/hooks';
import { showNotification } from '@mantine/notifications';
import {
  IconClipboardCopy,
  IconExternalLink,
  IconGridDots,
  IconPhotoCancel,
  IconPhotoMinus,
  IconPhotoUp,
} from '@tabler/icons-react';
import FileModal from 'components/File/FileModal';
import MutedText from 'components/MutedText';
import useFetch from 'lib/hooks/useFetch';
import { PaginatedFilesOptions, usePaginatedFiles, useRecent } from 'lib/queries/files';
import { useStats } from 'lib/queries/stats';
import { userSelector } from 'lib/recoil/user';
import { bytesToHuman } from 'lib/utils/bytes';
import { DataTable, DataTableSortStatus } from 'mantine-datatable';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRecoilValue } from 'recoil';
import RecentFiles from './RecentFiles';
import { StatCards } from './StatCards';

export default function Dashboard({ disableMediaPreview, exifEnabled, compress }) {
  const user = useRecoilValue(userSelector);

  const recent = useRecent('media');
  const stats = useStats();
  const clipboard = useClipboard();

  // pagination
  const [, setNumPages] = useState(0);
  const [page, setPage] = useState(1);
  const [numFiles, setNumFiles] = useState(0);

  useEffect(() => {
    (async () => {
      const { count } = await useFetch('/api/user/paged?count=true');
      setNumPages(count);

      const { count: filesCount } = await useFetch('/api/user/files?count=true');
      setNumFiles(filesCount);
    })();
  }, [page]);

  // sorting
  const [sortStatus, setSortStatus] = useState<DataTableSortStatus>({
    columnAccessor: 'createdAt',
    direction: 'asc',
  });

  const files = usePaginatedFiles(page, {
    filter: 'none',

    // only query for correct results if there is more than one page
    // otherwise, querying has no effect
    ...(numFiles > 1
      ? {
          sortBy: sortStatus.columnAccessor as PaginatedFilesOptions['sortBy'],
          order: sortStatus.direction,
        }
      : {}),
  });

  // file modal on click
  const [open, setOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  const updateFiles = () => {
    files.refetch();
    recent.refetch();
    stats.refetch();
  };

  const deleteFile = async (file) => {
    const res = await useFetch('/api/user/files', 'DELETE', {
      id: file.id,
    });
    if (!res.error) {
      updateFiles();
      showNotification({
        title: 'File Deleted',
        message: `${file.name}`,
        color: 'green',
        icon: <IconPhotoMinus size='1rem' />,
      });
    } else {
      showNotification({
        title: 'Failed to Delete File',
        message: res.error,
        color: 'red',
        icon: <IconPhotoCancel size='1rem' />,
      });
    }
  };

  const copyFile = async (file) => {
    clipboard.copy(`${window.location.protocol}//${window.location.host}${file.url}`);
    if (!navigator.clipboard)
      showNotification({
        title: 'Unable to copy to clipboard',
        message: 'Zipline is unable to copy to clipboard due to security reasons.',
        color: 'red',
      });
    else
      showNotification({
        title: 'Copied to clipboard',
        message: (
          <a
            href={`${window.location.protocol}//${window.location.host}${file.url}`}
          >{`${window.location.protocol}//${window.location.host}${file.url}`}</a>
        ),
        icon: <IconClipboardCopy size='1rem' />,
      });
  };

  const viewFile = async (file) => {
    window.open(`${window.location.protocol}//${window.location.host}${file.url}`);
  };

  return (
    <div>
      {selectedFile && (
        <FileModal
          open={open}
          setOpen={setOpen}
          file={selectedFile}
          loading={files.isLoading}
          refresh={() => files.refetch()}
          reducedActions={false}
          exifEnabled={exifEnabled}
          compress={compress}
        />
      )}

      <Title>Welcome back, {user?.username}</Title>
      <MutedText size='md'>
        You have <b>{numFiles === 0 ? '...' : numFiles}</b> files
      </MutedText>

      <StatCards />

      <RecentFiles disableMediaPreview={disableMediaPreview} exifEnabled={exifEnabled} compress={compress} />

      <Box my='sm'>
        <Group mb='md'>
          <Title>Files</Title>
          <Tooltip label='View Gallery'>
            <ActionIcon variant='filled' color='primary' component={Link} href='/dashboard/files'>
              <IconGridDots size='1rem' />
            </ActionIcon>
          </Tooltip>
        </Group>

        <DataTable
          withBorder
          borderRadius='md'
          highlightOnHover
          verticalSpacing='sm'
          columns={[
            { accessor: 'name', sortable: true },
            { accessor: 'mimetype', sortable: true },
            { accessor: 'size', sortable: true, render: (file) => bytesToHuman(file.size) },
            {
              accessor: 'createdAt',
              sortable: true,
              render: (file) => new Date(file.createdAt).toLocaleString(),
            },
            {
              accessor: 'actions',
              textAlignment: 'right',
              render: (file) => (
                <Group spacing={4} position='right' noWrap>
                  <Tooltip label='More details'>
                    <ActionIcon
                      onClick={() => {
                        setSelectedFile(file);
                        setOpen(true);
                      }}
                      color='blue'
                    >
                      <IconPhotoUp size='1rem' />
                    </ActionIcon>
                  </Tooltip>

                  <Tooltip label='Open file in new tab'>
                    <ActionIcon onClick={() => viewFile(file)} color='blue'>
                      <IconExternalLink size='1rem' />
                    </ActionIcon>
                  </Tooltip>

                  <ActionIcon onClick={() => copyFile(file)} color='green'>
                    <IconClipboardCopy size='1rem' />
                  </ActionIcon>
                  <ActionIcon onClick={() => deleteFile(file)} color='red'>
                    <IconPhotoMinus size='1rem' />
                  </ActionIcon>
                </Group>
              ),
            },
          ]}
          records={files.data ?? []}
          fetching={files.isLoading}
          loaderBackgroundBlur={5}
          loaderVariant='dots'
          minHeight={620}
          page={page}
          onPageChange={setPage}
          recordsPerPage={16}
          totalRecords={numFiles}
          sortStatus={sortStatus}
          onSortStatusChange={setSortStatus}
          rowContextMenu={{
            shadow: 'xl',
            borderRadius: 'md',
            items: (file) => [
              {
                key: 'view',
                icon: <IconExternalLink size='1rem' />,
                title: `View ${file.name}`,
                onClick: () => viewFile(file),
              },
              {
                key: 'copy',
                icon: <IconClipboardCopy size='1rem' />,
                title: `Copy ${file.name}`,
                onClick: () => copyFile(file),
              },
              {
                key: 'delete',
                icon: <IconPhotoMinus size='1rem' />,
                title: `Delete ${file.name}`,
                onClick: () => deleteFile(file),
              },
            ],
          }}
          onCellClick={({ column, record: file }) => {
            if (column.accessor === 'actions') return;

            setSelectedFile(file);
            setOpen(true);
          }}
        />
      </Box>
    </div>
  );
}
