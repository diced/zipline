import { Box, Card, Center, Grid, LoadingOverlay, Title, useMantineTheme } from '@mantine/core';

import { SmallTable } from 'components/SmallTable';
import { useStats } from 'lib/queries/stats';
import { colorHash } from 'lib/utils/client';
import { useEffect, useMemo, useState } from 'react';

import { Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

export default function Types() {
  const stats = useStats();
  const theme = useMantineTheme();

  const latest = useMemo(() => {
    if (stats.isLoading || !stats.data) return null;

    return stats.data[0];
  }, [stats]);

  const chartData = useMemo(() => {
    if (!latest) return null;

    const data = latest.data.types_count.map((type) => ({
      name: type.mimetype,
      value: type.count,
      fill: colorHash(type.mimetype),
    }));

    return {
      data,
    };
  }, [latest]);

  return !latest ? (
    <LoadingOverlay visible={stats.isLoading} />
  ) : (
    <Box my='md'>
      {latest.data.count_by_user.length ? (
        <Card my='md'>
          <Title size='h4'>Top Uploaders</Title>

          <SmallTable
            columns={[
              { id: 'username', name: 'Name' },
              { id: 'count', name: 'Files' },
            ]}
            rows={latest.data.count_by_user}
          />
        </Card>
      ) : null}
      <Card my='md'>
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
                    <Tooltip
                      contentStyle={{
                        backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[7] : 'white',
                        borderColor:
                          theme.colorScheme === 'dark' ? theme.colors.dark[7] : theme.colors.gray[3],
                      }}
                      itemStyle={{
                        color: theme.colorScheme === 'dark' ? 'white' : 'black',
                      }}
                    />
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
