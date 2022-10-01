import { DataGrid, dateFilterFn, stringFilterFn } from '@dicedtomato/mantine-data-grid';
import { Title, useMantineTheme } from '@mantine/core';
import { useClipboard } from '@mantine/hooks';
import { showNotification } from '@mantine/notifications';
import { CopyIcon, CrossIcon, DeleteIcon, EnterIcon } from 'components/icons';
import Link from 'components/Link';
import MutedText from 'components/MutedText';
import useFetch from 'lib/hooks/useFetch';
import { useFiles, useRecent } from 'lib/queries/files';
import { useStats } from 'lib/queries/stats';
import { userSelector } from 'lib/recoil/user';
import { useRecoilValue } from 'recoil';
import RecentFiles from './RecentFiles';
import { StatCards } from './StatCards';

export default function Dashboard() {
  const user = useRecoilValue(userSelector);
  const theme = useMantineTheme();

  const images = useFiles();
  const recent = useRecent('media');
  const stats = useStats();
  const clipboard = useClipboard();

  const updateImages = () => {
    images.refetch();
    recent.refetch();
    stats.refetch();
  };

  const deleteImage = async ({ original }) => {
    const res = await useFetch('/api/user/files', 'DELETE', { id: original.id });
    if (!res.error) {
      updateImages();
      showNotification({
        title: 'Image Deleted',
        message: '',
        color: 'green',
        icon: <DeleteIcon />,
      });
    } else {
      showNotification({
        title: 'Failed to delete image',
        message: res.error,
        color: 'red',
        icon: <CrossIcon />,
      });
    }

  };

  const copyImage = async ({ original }) => {
    clipboard.copy(`${window.location.protocol}//${window.location.host}${original.url}`);
    showNotification({
      title: 'Copied to clipboard',
      message: '',
      icon: <CopyIcon />,
    });
  };

  const viewImage = async ({ original }) => {
    window.open(`${window.location.protocol}//${window.location.host}${original.url}`);
  };

  return (
    <div>
      <Title>Welcome back, {user?.username}</Title>
      <MutedText size='md'>You have <b>{images.isSuccess ? images.data.length : '...'}</b> files</MutedText>

      <StatCards />

      <RecentFiles />

      <section>
        <Title>Files</Title>
        <MutedText size='md'>View your gallery <Link href='/dashboard/files'>here</Link>.</MutedText>
        <DataGrid
          data={images.data ?? []}
          loading={images.isLoading}
          withPagination={true}
          withColumnResizing={false}
          withColumnFilters={true}
          noEllipsis={true}
          withSorting={true}
          highlightOnHover={true}
          CopyIcon={CopyIcon}
          DeleteIcon={DeleteIcon}
          EnterIcon={EnterIcon}
          deleteImage={deleteImage}
          copyImage={copyImage}
          viewImage={viewImage}
          styles={{
            dataCell: {
              width: '100%',
            },
            td: {
              ':nth-child(1)': {
                minWidth: 170,
              },
              ':nth-child(2)': {
                minWidth: 100,
              },
            },
            th: {
              ':nth-child(1)': {
                minWidth: 170,
                padding: theme.spacing.lg,
                borderTopLeftRadius: theme.radius.sm,
              },
              ':nth-child(2)': {
                minWidth: 100,
                padding: theme.spacing.lg,
              },
              ':nth-child(3)': {
                padding: theme.spacing.lg,
              },
              ':nth-child(4)': {
                padding: theme.spacing.lg,
                borderTopRightRadius: theme.radius.sm,
              },
            },
            thead: {
              backgroundColor: theme.colors.dark[6],
            },
          }}
          empty={<></>}

          columns={[
            {
              accessorKey: 'file',
              header: 'Name',
              filterFn: stringFilterFn,
            },
            {
              accessorKey: 'mimetype',
              header: 'Type',
              filterFn: stringFilterFn,
            },
            {
              accessorKey: 'created_at',
              header: 'Date',
              filterFn: dateFilterFn,
            },
          ]}
        />
      </section>
    </div>
  );
}