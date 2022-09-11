import { Card, LoadingOverlay, MantineTheme, Title, useMantineTheme } from '@mantine/core';
import { ArcElement, CategoryScale, Chart as ChartJS, ChartData, ChartOptions, LinearScale, LineController, LineElement, PointElement, Tooltip } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import ColorHash from 'color-hash';
import { bytesToRead } from 'lib/clientUtils';
import { useStats } from 'lib/queries/stats';
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
    },

    datalabels: {
      display: false
    }
  },

  scales: {
    y: {
      ticks: {
        callback: (value) => value.toLocaleString(),
        color: theme.colors.gray[6],
      },

      grid: {
        color: theme.colors.gray[8],
      }
    },

    x: {
      ticks: {
        color: theme.colors.gray[6],
      },

      grid: {
        color: theme.colors.gray[8],
      }
    }
  }
});


type LineChartData = ChartData<'line', number[], string>;
type ChartDataMemo = {
  views: LineChartData,
  uploads: LineChartData,
  uploadTypes: ChartData<'pie', number[], string>,
  storage: LineChartData,
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
        datasets: [{
          label: 'Views',
          data: viewData,
          borderColor: theme.colors.blue[6],
          backgroundColor: theme.colors.blue[0],
        }]
      },

      uploads: {
        labels,
        datasets: [{
          label: 'Uploads',
          data: uploadData,
          borderColor: theme.colors.blue[6],
          backgroundColor: theme.colors.blue[0],
        }]
      },

      uploadTypes: {
        labels: latest?.data.types_count.map((x) => x.mimetype),
        datasets: [{
          data: latest?.data.types_count.map((x) => x.count),
          label: 'Upload Types',
          backgroundColor: latest?.data.types_count.map((x) => hash.hex(x.mimetype)),
        }]
      },

      storage: {
        labels,
        datasets: [{
          label: 'Storage',
          data: storageData,
          borderColor: theme.colors.blue[6],
          backgroundColor: theme.colors.blue[0],
        }]
      }
    }
  }, [historicalStats]);

  return (
    <section className='flex flex-col gap-5'>
      <LoadingOverlay visible={historicalStats.isLoading} />

      <div className='grid-cols-4 grid gap-5'>
        {/* 1/4 - upload types */}
        <Card className='flex flex-col gap-2'>
          <Title size='h4' className='text-center'>Upload Types</Title>
          {
            chartData && (
              <Pie
                data={chartData.uploadTypes}
                className='max-h-[20vh]'

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
                    }
                  }
                }}
              />
            )
          }
        </Card>
        {/* 3/4 - views */}
        <Card className='col-span-3'>
          <Title size='h4' className='text-center'>Total Views</Title>
          {
            chartData && (
              <Chart
                className='max-h-[20vh]'
                type='line'
                data={chartData.views}
                options={chartOptions}
              />
            )
          }
        </Card>
      </div>

      <div className='grid grid-cols-2 gap-5'>
        {/* 1/2 - uploaded files */}
        <Card className='flex flex-col gap-2'>
          <Title size='h4' className='text-center'>Total Uploads</Title>
          {
            chartData && (
              <Chart
                className='max-h-[20vh]'
                type='line'
                data={chartData.uploads}
                options={chartOptions}
              />
            )
          }
        </Card>
        {/* 1/2 - storage used */}
        <Card className='flex flex-col gap-2'>
          <Title size='h4' className='text-center'>Storage Usage</Title>
          {
            chartData && (
              <Chart
                className='max-h-[20vh]'
                type='line'
                data={chartData.storage}
                options={{
                  ...chartOptions,

                  scales: {
                    ...chartOptions.scales,
                    y: {
                      ...chartOptions.scales.y,

                      ticks: {
                        callback: (value) => bytesToRead(value as number),
                        color: theme.colors.gray[6],
                      },
                    }
                  },

                  plugins: {
                    ...chartOptions.plugins,
                    tooltip: {
                      ...chartOptions.plugins.tooltip,
                      callbacks: {
                        label: (context) => {
                          const value = context.raw as number;
                          return bytesToRead(value);
                        }
                      }
                    }
                  }
                }}
              />
            )
          }
        </Card>
      </div>
    </section>
  );
}