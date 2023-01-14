import { Box, Card, Grid, LoadingOverlay, Title } from '@mantine/core';

import { useStats } from 'lib/queries/stats';
import { bytesToHuman } from 'lib/utils/bytes';
import { useMemo } from 'react';

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export default function Graphs() {
  const historicalStats = useStats(10);

  const chartData = useMemo(() => {
    if (historicalStats.isLoading || !historicalStats.data) return;

    const data = Array.from(historicalStats.data).reverse();

    const views = data.map((stat) => ({
      date: new Date(stat.created_at).toLocaleDateString(),
      views: stat.data.views_count,
    }));
    const uploads = data.map((stat) => ({
      date: new Date(stat.created_at).toLocaleDateString(),
      uploads: stat.data.count,
    }));

    const storage = data.map((stat) => ({
      date: new Date(stat.created_at).toLocaleDateString(),
      bytes: stat.data.size_num,
    }));

    return {
      views,
      uploads,
      storage,
    };
  }, [historicalStats]);

  return (
    <Box mt='md'>
      <LoadingOverlay visible={historicalStats.isLoading} />

      <Grid>
        {/* 3/4 - views */}
        <Grid.Col md={12}>
          <Card>
            <Title size='h4'>Total Views</Title>
            {chartData && (
              <ResponsiveContainer width='100%' height={250}>
                <LineChart data={chartData.views}>
                  <CartesianGrid strokeDasharray='3 3' />
                  <XAxis dataKey='date' />
                  <YAxis />
                  <Tooltip />
                  <Line type='monotone' dataKey='views' name='Views' stroke='#8884d8' activeDot={{ r: 8 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </Card>
        </Grid.Col>

        {/* 1/2 - uploaded files */}
        <Grid.Col md={12} lg={6}>
          <Card>
            <Title size='h4'>Total Uploads</Title>
            {chartData && (
              <ResponsiveContainer width='100%' height={250}>
                <LineChart data={chartData.uploads}>
                  <CartesianGrid strokeDasharray='3 3' />
                  <XAxis dataKey='date' />
                  <YAxis />
                  <Tooltip />
                  <Line
                    type='monotone'
                    dataKey='uploads'
                    name='Uploads'
                    stroke='#8884d8'
                    activeDot={{ r: 8 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </Card>
        </Grid.Col>

        {/* 1/2 - storage used */}
        <Grid.Col md={12} lg={6}>
          <Card>
            <Title size='h4'>Storage Usage</Title>
            {chartData && (
              <ResponsiveContainer width='100%' height={250}>
                <LineChart data={chartData.storage}>
                  <CartesianGrid strokeDasharray='3 3' />
                  <XAxis dataKey='date' />
                  <YAxis width={80} tickFormatter={(value) => bytesToHuman(value as number)} />
                  <Tooltip formatter={(value) => bytesToHuman(value as number)} />
                  <Line
                    type='monotone'
                    stroke='#8884d8'
                    activeDot={{ r: 8 }}
                    dataKey='bytes'
                    name='Storage'
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </Card>
        </Grid.Col>
      </Grid>
    </Box>
  );
}
