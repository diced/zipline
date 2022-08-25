import { SimpleGrid, Skeleton, Title, Card as MantineCard, useMantineTheme, Box } from '@mantine/core';
import { randomId, useClipboard } from '@mantine/hooks';
import { showNotification } from '@mantine/notifications';
import Card from 'components/Card';
import File from 'components/File';
import { CopyIcon, CrossIcon, DeleteIcon, EnterIcon } from 'components/icons';
import Link from 'components/Link';
import MutedText from 'components/MutedText';
import { bytesToRead } from 'lib/clientUtils';
import useFetch from 'lib/hooks/useFetch';
import { useStoreSelector } from 'lib/redux/store';
import { DataGrid, dateFilterFn, stringFilterFn } from '@dicedtomato/mantine-data-grid';
import { useEffect, useState } from 'react';

export default function Dashboard() {
  const user = useStoreSelector(state => state.user);
  const theme = useMantineTheme();

  const [images, setImages] = useState([]);
  const [recent, setRecent] = useState([]);
  const [stats, setStats] = useState(null);
  const clipboard = useClipboard();

  const updateImages = async () => {
    const imgs = await useFetch('/api/user/files');
    const recent = await useFetch('/api/user/recent?filter=media');
    const stts = await useFetch('/api/stats');
    setImages(imgs.map(x => ({ ...x, created_at: new Date(x.created_at).toLocaleString() })));
    setStats(stts);
    setRecent(recent);
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

  useEffect(() => {
    updateImages();
  }, []);

  return (
    <>
      <Title>Welcome back, {user?.username}</Title>
      <MutedText size='md'>You have <b>{images.length ? images.length : '...'}</b> files</MutedText>

      <Title>Recent Files</Title>
      <SimpleGrid
        cols={4}
        spacing='lg'
        breakpoints={[
          { maxWidth: 'sm', cols: 1, spacing: 'sm' },
        ]}
      >
        {recent.length ? recent.map(image => (
          <File key={randomId()} image={image} updateImages={updateImages} />
        )) : [1, 2, 3, 4].map(x => (
          <div key={x}>
            <Skeleton width='100%' height={220} sx={{ borderRadius: 1 }} />
          </div>
        ))}
      </SimpleGrid>

      <Title mt='md'>Stats</Title>
      <MutedText size='md'>View more stats here <Link href='/dashboard/stats'>here</Link>.</MutedText>
      <SimpleGrid
        cols={3}
        spacing='lg'
        breakpoints={[
          { maxWidth: 'sm', cols: 1, spacing: 'sm' },
        ]}
      >
        <Card name='Size' sx={{ height: '100%' }}>
          <MutedText>{stats ? stats.size : <Skeleton height={8} />}</MutedText>
          <Title order={2}>Average Size</Title>
          <MutedText>{stats ? bytesToRead(stats.size_num / stats.count) : <Skeleton height={8} />}</MutedText>
        </Card>
        <Card name='Images' sx={{ height: '100%' }}>
          <MutedText>{stats ? stats.count : <Skeleton height={8} />}</MutedText>
          <Title order={2}>Views</Title>
          <MutedText>{stats ? `${stats.views_count} (${isNaN(stats.views_count / stats.count) ? 0 : Math.round(stats.views_count / stats.count)})` : <Skeleton height={8} />}</MutedText>
        </Card>
        <Card name='Users' sx={{ height: '100%' }}>
          <MutedText>{stats ? stats.count_users : <Skeleton height={8} />}</MutedText>
        </Card>
      </SimpleGrid>

      <Title mt='md'>Files</Title>
      <MutedText size='md'>View your gallery <Link href='/dashboard/files'>here</Link>.</MutedText>
      <DataGrid
        data={images}
        loading={images.length ? false : true}
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
    </>
  );
}