import { SimpleGrid, Skeleton, Title } from '@mantine/core';
import Card from 'components/Card';
import MutedText from 'components/MutedText';
import { SmallTable } from 'components/SmallTable';
import { bytesToRead } from 'lib/clientUtils';
import { useStats } from 'lib/queries/stats';

export default function Stats() {
  const stats = useStats();

  return (
    <>
      <Title mb='md'>Stats</Title>
      <SimpleGrid
        cols={3}
        spacing='lg'
        breakpoints={[{ maxWidth: 'sm', cols: 1, spacing: 'sm' }]}
      >
        <Card name='Size' sx={{ height: '100%' }}>
          <MutedText>{stats.isSuccess ? stats.data.size : <Skeleton height={8} />}</MutedText>
          <Title order={2}>Average Size</Title>
          <MutedText>
            {stats.isSuccess ? (
              bytesToRead(stats.data.size_num / stats.data.count)
            ) : (
              <Skeleton height={8} />
            )}
          </MutedText>
        </Card>
        <Card name='Images' sx={{ height: '100%' }}>
          <MutedText>{stats.isSuccess ? stats.data.count : <Skeleton height={8} />}</MutedText>
          <Title order={2}>Views</Title>
          <MutedText>
            {stats.isSuccess ? (
              `${stats.data.views_count} (${
                isNaN(stats.data.views_count / stats.data.count)
                  ? 0
                  : Math.round(stats.data.views_count / stats.data.count)
              })`
            ) : (
              <Skeleton height={8} />
            )}
          </MutedText>
        </Card>
        <Card name='Users' sx={{ height: '100%' }}>
          <MutedText>
            {stats.isSuccess ? stats.data.count_users : <Skeleton height={8} />}
          </MutedText>
        </Card>
      </SimpleGrid>

      {stats.isSuccess && stats.data.count_by_user.length ? (
        <Card name='Files per User' mt={22}>
          <SmallTable
            columns={[
              { id: 'username', name: 'Name' },
              { id: 'count', name: 'Files' },
            ]}
            rows={stats.isSuccess ? stats.data.count_by_user : []}
          />
        </Card>
      ) : null}
      <Card name='Types' mt={22}>
        <SmallTable
          columns={[
            { id: 'mimetype', name: 'Type' },
            { id: 'count', name: 'Count' },
          ]}
          rows={stats.isSuccess ? stats.data.types_count : []}
        />
      </Card>
    </>
  );
}
