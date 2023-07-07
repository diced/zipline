import { Response } from '@/lib/api/response';
import { File } from '@/lib/db/models/file';
import useSWR from 'swr';

const fetcher = async (
  [_, page, filter, favorite]: [unknown, number, string, string?] = ['/api/user/files?page=1', 0, 'dashboard']
) => {
  const res = await fetch(`/api/user/files?page=${page}&filter=${filter}${favorite ? `&favorite=true` : ''}`);

  if (!res.ok) {
    const json = await res.json();

    throw new Error(json.message);
  }

  return res.json();
};

export function useApiPagination(page: number = 1, filter: string = 'dashboard', favorite?: string) {
  const { data, error, isLoading, mutate } = useSWR<Extract<Response['/api/user/files'], File[]>>(
    [`/api/user/files`, page, filter, favorite],
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
