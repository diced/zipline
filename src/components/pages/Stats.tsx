import React, { useEffect, useState } from 'react';

import Card from 'components/Card';
import Image from 'components/Image';
import ImagesTable from 'components/ImagesTable';
import useFetch from 'lib/hooks/useFetch';
import { useStoreSelector } from 'lib/redux/store';
import { Box, Text, Table, Skeleton, Title, SimpleGrid } from '@mantine/core';
import { randomId, useClipboard } from '@mantine/hooks';
import Link from 'components/Link';
import { CopyIcon, Cross1Icon, TrashIcon } from '@modulz/radix-icons';
import { useNotifications } from '@mantine/notifications';

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

function StatText({ children }) {
  return <Text color='gray' size='xl'>{children}</Text>;
}

function StatTable({ rows, columns }) {
  return (
    <Box sx={{ pt: 1 }}>
      <Table highlightOnHover>
        <thead>
          <tr>
            {columns.map(col => (
              <th key={randomId()}>{col.name}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={randomId()}>
              {columns.map(col => (
                <td key={randomId()}>
                  {col.format ? col.format(row[col.id]) : row[col.id]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </Table>
    </Box>
  );
}

export default function Dashboard() {
  const user = useStoreSelector(state => state.user);

  const [stats, setStats] = useState(null);

  const update = async () => {
    const stts = await useFetch('/api/stats');
    setStats(stts);
  };

  useEffect(() => {
    update();
  }, []);
  
  return (
    <>
      <Title>Stats</Title>
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
      </Card>
    </>
  );
}