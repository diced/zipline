import { useMutation, useQuery } from '@tanstack/react-query';
import queryClient from './client';

export type UserFilesResponse = {
  created_at: string;
  expires_at?: string;
  file: string;
  mimetype: string;
  id: string;
  favorite: boolean;
  url: string;
}

export const useFiles = (query: { [key: string]: string } = {}) => {
  const queryBuilder = new URLSearchParams(query);
  const queryString = queryBuilder.toString();

  return useQuery<UserFilesResponse[]>(['files', queryString], async () => {
    return fetch('/api/user/files?' + queryString)
      .then(res => res.json() as Promise<UserFilesResponse[]>)
      .then(data =>
        query.paged === 'true'
          ? data
          : data.map(x => ({ 
            ...x, 
            created_at: new Date(x.created_at).toLocaleString(),
          }))
      );
  });
};

export const usePaginatedFiles = (query: { [key: string]: string } = {}) => {
  query['paged'] = 'true';
  const data = useFiles(query) as ReturnType<typeof useQuery> & { data: UserFilesResponse[][] };
  return data;
};

export const useRecent = (filter?: string) => {
  return useQuery<UserFilesResponse[]>(['recent', filter], async () => {
    return fetch(`/api/user/recent?filter=${encodeURIComponent(filter)}`)
      .then(res => res.json())
      .then(data => data.map(x => ({ 
        ...x, 
        created_at: new Date(x.created_at).toLocaleString(),
      })));
  });
};

export function useFileDelete() {
  // '/api/user/files', 'DELETE', { id: image.id }
  return useMutation(async (id: string) => {
    return fetch('/api/user/files', {
      method: 'DELETE',
      body: JSON.stringify({ id }),
      headers: {
        'content-type': 'application/json',
      },
    }).then(res => res.json());
  }, {
    onSuccess: () => {
      queryClient.refetchQueries(['files']);
    },
  });
}

export function useFileFavorite() {
  // /api/user/files', 'PATCH', { id: image.id, favorite: !image.favorite }
  return useMutation(async (data: { id: string, favorite: boolean }) => {
    return fetch('/api/user/files', {
      method: 'PATCH',
      body: JSON.stringify(data),
      headers: {
        'content-type': 'application/json',
      },
    }).then(res => res.json());
  }, {
    onSuccess: () => {
      queryClient.refetchQueries(['files']);
    },
  });
}

export function invalidateFiles() {
  return queryClient.invalidateQueries(
    ['files', 'recent', 'stats']
  );
}