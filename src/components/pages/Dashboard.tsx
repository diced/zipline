import React, { useEffect, useState } from 'react';

import Card from 'components/Card';
import ZiplineImage from 'components/Image';
import ImagesTable from 'components/ImagesTable';
import useFetch from 'lib/hooks/useFetch';
import { useStoreSelector } from 'lib/redux/store';
import { Text, Skeleton, Title, SimpleGrid } from '@mantine/core';
import { randomId, useClipboard } from '@mantine/hooks';
import Link from 'components/Link';
import { CopyIcon, Cross1Icon, TrashIcon } from '@modulz/radix-icons';
import { useNotifications } from '@mantine/notifications';
import StatText from 'components/StatText';

type Aligns = 'inherit' | 'right' | 'left' | 'center' | 'justify';

export function bytesToRead(bytes: number) {
  if (isNaN(bytes)) return '0.0 B';
  if (bytes === Infinity) return '0.0 B';
  const units = ['B', 'kB', 'MB', 'GB', 'TB', 'PB'];
  let num = 0;

  while (bytes > 1024) {
    bytes /= 1024;
    ++num;
  }

  return `${bytes.toFixed(1)} ${units[num]}`;
}

export default function Dashboard() {
  const user = useStoreSelector(state => state.user);

  const [images, setImages] = useState([]);
  const [recent, setRecent] = useState([]);
  const [stats, setStats] = useState(null);
  const clipboard = useClipboard();
  const notif = useNotifications();

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
      notif.showNotification({
        title: 'Image Deleted',
        message: '',
        color: 'green',
        icon: <TrashIcon />,
      });
    } else {
      notif.showNotification({
        title: 'Failed to delete image',
        message: res.error,
        color: 'red',
        icon: <Cross1Icon />,
      });
    }
    
  };

  const copyImage = async ({ original }) => {
    clipboard.copy(`${window.location.protocol}//${window.location.host}${original.url}`);
    notif.showNotification({
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
      <Title>Welcome back {user?.username}</Title>
      <Text color='gray' sx={{ paddingBottom: 4 }}>You have <b>{images.length ? images.length : '...'}</b> files</Text>

      <Title>Recent Files</Title>
      <SimpleGrid
        cols={4}
        spacing='lg'
        breakpoints={[
          { maxWidth: 'sm', cols: 1, spacing: 'sm' },
        ]}
      >
        {recent.length ? recent.map(image => (
          <ZiplineImage key={randomId()} image={image} updateImages={updateImages} />
        )) : [1,2,3,4].map(x => (
          <div key={x}>
            <Skeleton width='100%' height={220} sx={{ borderRadius: 1 }}/>
          </div>
        ))}
      </SimpleGrid>

      <Title mt='md'>Stats</Title>
      <Text>View more stats here <Link href='/dashboard/stats'>here</Link>.</Text>
      <SimpleGrid
        cols={3}
        spacing='lg'
        breakpoints={[
          { maxWidth: 'sm', cols: 1, spacing: 'sm' },
        ]}
      >
        <Card name='Size' sx={{ height: '100%' }}>
          <StatText>{stats ? stats.size : <Skeleton height={8} />}</StatText>
          <Title order={2}>Average Size</Title>
          <StatText>{stats ? bytesToRead(stats.size_num / stats.count) : <Skeleton height={8} />}</StatText>
        </Card>
        <Card name='Images' sx={{ height: '100%' }}>
          <StatText>{stats ? stats.count : <Skeleton height={8} />}</StatText>
          <Title order={2}>Views</Title>
          <StatText>{stats ? `${stats.views_count} (${isNaN(stats.views_count / stats.count) ? 0 : Math.round(stats.views_count / stats.count)})` : <Skeleton height={8} />}</StatText>
        </Card>
        <Card name='Users' sx={{ height: '100%' }}>
          <StatText>{stats ? stats.count_users : <Skeleton height={8} />}</StatText>
        </Card>
      </SimpleGrid>

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

      {/* <Title mt='md'>Files</Title>
      <Text>View previews of your files in the <Link href='/dashboard/files'>browser</Link>.</Text>
      <ReactTable
        columns={[
          { accessor: 'file', Header: 'Name', minWidth: 170, align: 'inherit' as Aligns },
          { accessor: 'mimetype', Header: 'Type', minWidth: 100, align: 'inherit' as Aligns },
          { accessor: 'created_at', Header: 'Date' },
        ]}
        data={images}
        pagination
      />
      <Card name='Files per User' mt={22}>
        <StatTable
          columns={[
            { id: 'username', name: 'Name' },
            { id: 'count', name: 'Files' },
          ]}
          rows={stats ? stats.count_by_user : []} />
      </Card>
      <Card name='Types' mt={22}>
        <StatTable
          columns={[
            { id: 'mimetype', name: 'Type' },
            { id: 'count', name: 'Count' },
          ]}
          rows={stats ? stats.types_count : []} />
      </Card> */}
    </>
  );
}