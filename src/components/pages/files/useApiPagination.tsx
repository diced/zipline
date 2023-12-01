import { Response } from '@/lib/api/response';
import type { Prisma } from '@prisma/client';
import useSWR from 'swr';

type ApiPaginationOptions = {
  page?: number;
  filter?: string;
  perpage?: number;
  favorite?: boolean;
  sort?: keyof Prisma.FileOrderByWithAggregationInput;
  order?: 'asc' | 'desc';
  id?: string;
  search?: {
    threshold?: number;
    field?: string;
    query: string;
  };
};

const fetcher = async (
  { options }: { options: ApiPaginationOptions; key: string } = {
    options: {
      page: 1,
    },
    key: '/api/user/files',
  },
): Promise<Response['/api/user/files']> => {
  const searchParams = new URLSearchParams();
  if (options.page) searchParams.append('page', options.page.toString());
  if (options.filter) searchParams.append('filter', options.filter);
  if (options.favorite) searchParams.append('favorite', options.favorite.toString());
  if (options.perpage) searchParams.append('perpage', options.perpage.toString());
  if (options.sort) searchParams.append('sortBy', options.sort);
  if (options.order) searchParams.append('order', options.order);
  if (options.id) searchParams.append('id', options.id);
  if (options.search) {
    if (options.search.threshold !== undefined)
      searchParams.append('searchThreshold', options.search.threshold.toString());
    if (options.search.field) searchParams.append('searchField', options.search.field);
    searchParams.append('searchQuery', options.search.query);
  }

  const res = await fetch(`/api/user/files${searchParams.toString() ? `?${searchParams.toString()}` : ''}`);

  if (!res.ok) {
    const json = await res.json();

    throw new Error(json.message);
  }

  return res.json();
};

export function useApiPagination(
  options: ApiPaginationOptions = {
    page: 1,
  },
) {
  const { data, error, isLoading, mutate } = useSWR<Response['/api/user/files']>(
    { key: '/api/user/files', options },
    fetcher,
  );

  return {
    data,
    error,
    isLoading,
    mutate,
  };
}
