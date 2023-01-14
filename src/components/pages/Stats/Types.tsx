import { Box, Card, Center, Grid, LoadingOverlay, Title } from '@mantine/core';

import { SmallTable } from 'components/SmallTable';
import { useStats } from 'lib/queries/stats';
import { colorHash } from 'lib/utils/client';
import { useMemo } from 'react';

import { Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

export default function Types() {
  const stats = useStats();

  if (stats.isLoading) return <LoadingOverlay visible />;

  const latest = stats.data[0];

  const chartData = useMemo(() => {
    return {
      data: latest.data.types_count.map((type) => ({
        name: type.mimetype,
        value: type.count,
        fill: colorHash(type.mimetype),
      })),
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
            <Center>
              {chartData && (
                <ResponsiveContainer width='100%' height={250}>
                  <PieChart>
                    <Pie
                      data={chartData.data}
                      dataKey='value'
                      nameKey='name'
                      cx='50%'
                      cy='50%'
                      outerRadius={80}
                      label={({ name, value }) => `${name} (${value})`}
                    />
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </Center>
          </Grid.Col>
        </Grid>
      </Card>
    </Box>
  );
}
