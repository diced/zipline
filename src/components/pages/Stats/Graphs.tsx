import { Box, Card, Grid, LoadingOverlay, MantineTheme, Title, useMantineTheme } from '@mantine/core';
import {
  ArcElement,
  CategoryScale,
  Chart as ChartJS,
  ChartData,
  ChartOptions,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Tooltip,
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import ColorHash from 'color-hash';
import { useStats } from 'lib/queries/stats';
import { bytesToHuman } from 'lib/utils/bytes';
import { useMemo } from 'react';
import { Chart, Pie } from 'react-chartjs-2';

const hash = new ColorHash();
ChartJS.register(ArcElement);
ChartJS.register(ChartDataLabels);
ChartJS.register(LinearScale);
ChartJS.register(CategoryScale, PointElement, LineController, LineElement, Tooltip);

const CHART_OPTIONS = (theme: MantineTheme): ChartOptions => ({
  plugins: {
    tooltip: {
      enabled: true,
      intersect: false,
    },

    datalabels: {
      display: false,
    },
  },

  scales: {
    y: {
      ticks: {
        callback: (value) => value.toLocaleString(),
        color: theme.colors.gray[6],
      },

      grid: {
        color: theme.colors.gray[8],
      },
    },

    x: {
      ticks: {
        color: theme.colors.gray[6],
      },

      grid: {
        color: theme.colors.gray[8],
      },
    },
  },
});

type LineChartData = ChartData<'line', number[], string>;
type ChartDataMemo = {
  views: LineChartData;
  uploads: LineChartData;
  uploadTypes: ChartData<'pie', number[], string>;
  storage: LineChartData;
} | void;

export default function Graphs() {
  const historicalStats = useStats(10);
  const latest = historicalStats.data?.[0];
  const theme = useMantineTheme();

  const chartOptions = useMemo(() => CHART_OPTIONS(theme), [theme]);

  const chartData = useMemo<ChartDataMemo>(() => {
    if (historicalStats.isLoading || !historicalStats.data) return;

    const data = Array.from(historicalStats.data).reverse();
    const labels = data.map((stat) => new Date(stat.created_at).toLocaleDateString());
    const viewData = data.map((stat) => stat.data.views_count);
    const uploadData = data.map((stat) => stat.data.count);
    const storageData = data.map((stat) => stat.data.size_num);

    return {
      views: {
        labels,
        datasets: [
          {
            label: 'Views',
            data: viewData,
            borderColor: theme.colors.blue[6],
            backgroundColor: theme.colors.blue[0],
          },
        ],
      },

      uploads: {
        labels,
        datasets: [
          {
            label: 'Uploads',
            data: uploadData,
            borderColor: theme.colors.blue[6],
            backgroundColor: theme.colors.blue[0],
          },
        ],
      },

      uploadTypes: {
        labels: latest?.data.types_count.map((x) => x.mimetype),
        datasets: [
          {
            data: latest?.data.types_count.map((x) => x.count),
            label: 'Upload Types',
            backgroundColor: latest?.data.types_count.map((x) => hash.hex(x.mimetype)),
          },
        ],
      },

      storage: {
        labels,
        datasets: [
          {
            label: 'Storage',
            data: storageData,
            borderColor: theme.colors.blue[6],
            backgroundColor: theme.colors.blue[0],
          },
        ],
      },
    };
  }, [historicalStats]);

  return (
    <Box mt='md'>
      <LoadingOverlay visible={historicalStats.isLoading} />

      <Grid>
        {/* 1/4 - upload types */}
        <Grid.Col md={12} lg={4}>
          <Card>
            <Title size='h4'>Upload Types</Title>
            {chartData && (
              <Pie
                data={chartData.uploadTypes}
                options={{
                  plugins: {
                    datalabels: {
                      formatter: (_, ctx) => {
                        // mime: count
                        const mime = ctx.chart.data.labels[ctx.dataIndex];
                        const count = ctx.chart.data.datasets[0].data[ctx.dataIndex];
                        return `${mime}: ${count}`;
                      },

                      color: 'white',
                      textShadowBlur: 7,
                      textShadowColor: 'black',
                    },
                  },
                }}
                style={{ maxHeight: '20vh' }}
              />
            )}
          </Card>
        </Grid.Col>

        {/* 3/4 - views */}
        <Grid.Col md={12} lg={8}>
          <Card>
            <Title size='h4'>Total Views</Title>
            {chartData && (
              <Chart
                type='line'
                data={chartData.views}
                options={chartOptions}
                style={{ maxHeight: '20vh' }}
              />
            )}
          </Card>
        </Grid.Col>

        {/* 1/2 - uploaded files */}
        <Grid.Col md={12} lg={6}>
          <Card>
            <Title size='h4'>Total Uploads</Title>
            {chartData && (
              <Chart
                type='line'
                data={chartData.uploads}
                options={chartOptions}
                style={{ maxHeight: '20vh' }}
              />
            )}
          </Card>
        </Grid.Col>

        {/* 1/2 - storage used */}
        <Grid.Col md={12} lg={6}>
          <Card>
            <Title size='h4'>Storage Usage</Title>
            {chartData && (
              <Chart
                type='line'
                data={chartData.storage}
                options={{
                  ...chartOptions,

                  scales: {
                    ...chartOptions.scales,
                    y: {
                      ...chartOptions.scales.y,

                      ticks: {
                        callback: (value) => bytesToHuman(value as number),
                        color: theme.colors.gray[6],
                      },
                    },
                  },

                  plugins: {
                    ...chartOptions.plugins,
                    tooltip: {
                      ...chartOptions.plugins.tooltip,
                      callbacks: {
                        label: (context) => {
                          const value = context.raw as number;
                          return bytesToHuman(value);
                        },
                      },
                    },
                  },
                }}
                style={{ maxHeight: '20vh' }}
              />
            )}
          </Card>
        </Grid.Col>
      </Grid>
    </Box>
  );
}
