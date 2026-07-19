import type { Response } from '@/lib/api/response';
import useSWRInfinite from 'swr/infinite';

type InfiniteFilesOptions = {
  route?: string;
  perpage?: number;
  favorite?: boolean;
  sort?:
    | 'name'
    | 'id'
    | 'createdAt'
    | 'updatedAt'
    | 'deletesAt'
    | 'originalName'
    | 'size'
    | 'type'
    | 'views'
    | 'favorite';
  order?: 'asc' | 'desc';
  id?: string;
  folderId?: string;
  search?: {
    field?: string;
    query: string;
  };
};

export type InfiniteFilesPage = Response['/api/user/files'];

export function useInfiniteFiles(options: InfiniteFilesOptions = {}) {
  const route = options.route ?? '/api/user/files';

  const getKey = (pageIndex: number, previousPageData: InfiniteFilesPage | null) => {
    if (previousPageData && pageIndex >= (previousPageData.pages ?? 1)) return null;

    const searchParams = new URLSearchParams();
    searchParams.append('page', (pageIndex + 1).toString());
    if (options.perpage) searchParams.append('perpage', options.perpage.toString());
    if (options.favorite) searchParams.append('favorite', options.favorite.toString());
    if (options.sort) searchParams.append('sortBy', options.sort);
    if (options.order) searchParams.append('order', options.order);
    if (options.id) searchParams.append('id', options.id);
    if (options.search) {
      if (options.search.field) searchParams.append('searchField', options.search.field);
      searchParams.append('searchQuery', options.search.query);
    }
    if (options.folderId) searchParams.append('folder', options.folderId);

    return `${route}?${searchParams.toString()}`;
  };

  const { data, isLoading, isValidating, size, setSize, mutate } = useSWRInfinite<InfiniteFilesPage>(getKey, {
    revalidateFirstPage: false,
  });

  const pages = data ?? [];
  const allFiles = pages.flatMap((page) => page.page ?? []);
  const totalRecords = pages[0]?.total ?? 0;
  const totalPages = pages[0]?.pages ?? 1;
  const hasMore = size < totalPages;
  const isLoadingMore = isValidating && data && data.length >= size && size > 0;

  const loadMore = () => {
    if (hasMore && !isValidating) setSize(size + 1);
  };

  const reset = () => {
    setSize(1);
  };

  return {
    data: allFiles,
    totalRecords,
    totalPages,
    isLoading,
    isLoadingMore,
    hasMore,
    loadMore,
    reset,
    mutate,
    size,
  };
}
