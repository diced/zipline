import { Response } from '@/lib/api/response';
import useSWR from 'swr';

type ApiStatsOptions = {
  from?: string;
  to?: string;
  all?: boolean;
};

const fetcher = async ({ options }: { options: ApiStatsOptions } = { options: {} }) => {
  const searchParams = new URLSearchParams();
  if (options.from) searchParams.append('from', options.from);
  if (options.to) searchParams.append('to', options.to);
  if (options.all) searchParams.append('all', 'true');

  const res = await fetch(`/api/stats${searchParams.toString() ? `?${searchParams.toString()}` : ''}`);

  if (!res.ok) {
    const json = await res.json();

    throw new Error(json.message);
  }

  return res.json();
};

export function useApiStats(options: ApiStatsOptions = {}) {
  if (!options.from && !options.to)
    return { data: undefined, error: undefined, isLoading: false, mutate: () => {} };

  const { data, error, isLoading, mutate } = useSWR<Response['/api/stats']>(
    { key: '/api/stats', options },
    fetcher,
  );

  return {
    data,
    error,
    isLoading,
    mutate,
  };
}
