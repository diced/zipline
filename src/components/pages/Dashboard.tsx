import { SimpleGrid, Skeleton, Text, Title } from '@mantine/core';
import { randomId, useClipboard } from '@mantine/hooks';
import { showNotification } from '@mantine/notifications';
import Card from 'components/Card';
import File from 'components/File';
import { CopyIcon, CrossIcon, DeleteIcon } from 'components/icons';
import ImagesTable from 'components/ImagesTable';
import Link from 'components/Link';
import MutedText from 'components/MutedText';
import { bytesToRead } from 'lib/clientUtils';
import useFetch from 'lib/hooks/useFetch';
import { useStoreSelector } from 'lib/redux/store';
import { useEffect, useState } from 'react';

type Aligns = 'inherit' | 'right' | 'left' | 'center' | 'justify';

export default function Dashboard() {
  const user = useStoreSelector(state => state.user);

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
      <ImagesTable
        columns={[
          { accessor: 'file', Header: 'Name', minWidth: 170, align: 'inherit' as Aligns },
          { accessor: 'mimetype', Header: 'Type', minWidth: 100, align: 'inherit' as Aligns },
          { accessor: 'created_at', Header: 'Date' },
        ]}
        data={images}
        deleteImage={deleteImage}
        copyImage={copyImage}
        viewImage={viewImage}
      />
    </>
  );
}