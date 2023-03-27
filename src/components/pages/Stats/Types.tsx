import { Box, Card, Center, Grid, LoadingOverlay, Title } from '@mantine/core';
import { ChartData } from 'chart.js';
import { SmallTable } from 'components/SmallTable';
import { useStats } from 'lib/queries/stats';
import { colorHash } from 'lib/utils/client';
import { useMemo } from 'react';
import { Pie } from 'react-chartjs-2';

export default function Types() {
  const stats = useStats();

  if (stats.isLoading) return <LoadingOverlay visible />;

  const latest = stats.data[0];

  const chartData = useMemo<{
    uploadTypes: ChartData<'pie', number[], string>;
  }>(() => {
    return {
      uploadTypes: {
        labels: latest?.data.types_count.map((x) => x.mimetype),
        datasets: [
          {
            data: latest?.data.types_count.map((x) => x.count),
            label: ' Count',
            backgroundColor: latest?.data.types_count.map((x) => colorHash(x.mimetype)),
          },
        ],
      },
    };
  }, [latest]);

  return (
    <Box mt='md'>
      {latest.data.count_by_user.length ? (
        <Card>
          <SmallTable
            columns={[
              { id: 'username', name: 'Name' },
              { id: 'count', name: 'Files' },
            ]}
            rows={latest.data.count_by_user}
          />
        </Card>
      ) : null}
      <Card>
        <Title size='h4'>Upload Types</Title>
        <Grid>
          <Grid.Col md={12} lg={8}>
            <SmallTable
              columns={[
                { id: 'mimetype', name: 'Type' },
                { id: 'count', name: 'Count' },
              ]}
              rows={latest.data.types_count}
            />
          </Grid.Col>

          <Grid.Col md={12} lg={4}>
            <Center>{chartData && <Pie data={chartData.uploadTypes} style={{ maxHeight: '20vh' }} />}</Center>
          </Grid.Col>
        </Grid>
      </Card>
    </Box>
  );
}
