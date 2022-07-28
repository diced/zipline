import { SimpleGrid, Skeleton, Title } from '@mantine/core';
import Card from 'components/Card';
import MutedText from 'components/MutedText';
import { SmallTable } from 'components/SmallTable';
import { bytesToRead } from 'lib/clientUtils';
import useFetch from 'lib/hooks/useFetch';
import { useEffect, useState } from 'react';

export default function Stats() {
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
      <Title mb='md'>Stats</Title>
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

      {stats && stats.count_by_user.length ? (
        <Card name='Files per User' mt={22}>
          <SmallTable
            columns={[
              { id: 'username', name: 'Name' },
              { id: 'count', name: 'Files' },
            ]}
            rows={stats ? stats.count_by_user : []} />
        </Card>
      ) : null}
      <Card name='Types' mt={22}>
        <SmallTable
          columns={[
            { id: 'mimetype', name: 'Type' },
            { id: 'count', name: 'Count' },
          ]}
          rows={stats ? stats.types_count : []} />
      </Card>
    </>
  );
}