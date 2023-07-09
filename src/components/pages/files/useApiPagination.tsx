import { Response } from '@/lib/api/response';
import { File } from '@/lib/db/models/file';
import type { Prisma } from '@prisma/client';
import useSWR from 'swr';

type ApiPaginationOptions = {
  page?: number;
  filter?: string;
  perpage?: number;
  favorite?: boolean;
  sort?: keyof Prisma.FileOrderByWithRelationInput;
  order?: 'asc' | 'desc';
};

const fetcher = async (
  { options }: { options: ApiPaginationOptions } = {
    options: {
      page: 1,
    },
  }
) => {
  const searchParams = new URLSearchParams();
  if (options.page) searchParams.append('page', options.page.toString());
  if (options.filter) searchParams.append('filter', options.filter);
  if (options.favorite) searchParams.append('favorite', options.favorite.toString());
  if (options.perpage) searchParams.append('perpage', options.perpage.toString());
  if (options.sort) searchParams.append('sortBy', options.sort);
  if (options.order) searchParams.append('order', options.order);

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
  }
) {
  const { data, error, isLoading, mutate } = useSWR<Extract<Response['/api/user/files'], File[]>>(
    { key: `/api/user/files`, options },
    fetcher
  );
  const {
    data: pagesCount,
    error: pagesCountError,
    isLoading: pagesCountLoading,
    mutate: pagesCountMutate,
  } = useSWR<Extract<Response['/api/user/files'], { count: number }>>(`/api/user/files?pagecount=true`);

  return {
    pages: {
      data,
      error,
      isLoading,
      mutate,
    },
    pagesCount: {
      data: pagesCount,
      error: pagesCountError,
      isLoading: pagesCountLoading,
      mutate: pagesCountMutate,
    },
  };
}
