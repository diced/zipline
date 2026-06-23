import { LineChartProps } from '@mantine/charts';

export const defaultChartProps: Partial<LineChartProps> & { dataKey: string } = {
  curveType: 'bump',
  lineChartProps: { syncId: 'datedStatistics' },
  connectNulls: true,
  withDots: true,
  withLegend: true,
  dotProps: { r: 0 },
  activeDotProps: { r: 3 },
  mt: 'xs',
  h: 400,
  dataKey: 'date',
};

export function percentChange(a: number | bigint, b: number | bigint): [string, string] {
  if (typeof a === 'bigint') a = Number(a);
  if (typeof b === 'bigint') b = Number(b);

  const change = Math.round(((b - a) / a) * 100);
  const color = change > 0 ? 'green' : change < 0 ? 'red' : 'gray';

  if (change === Infinity) return [color, '∞%'];
  if (isNaN(change)) return ['gray', '0%'];

  return [color, `${change}%`];
}
