import { useMutation, useQuery } from '@tanstack/react-query';
import queryClient from './client';

export type URLResponse = {
  created_at: string;
  destination: string;
  id: string;
  url: string;
  vanity: string;
  maxViews?: number;
  views: number;
};

export function useURLs() {
  return useQuery<URLResponse[]>(['urls'], async () => {
    return fetch('/api/user/urls').then((res) => res.json());
  });
}

export function useURLDelete() {
  return useMutation(
    async (id: string) => {
      // '/api/user/urls', 'DELETE', { id: u.id }
      return fetch('/api/user/urls', {
        method: 'DELETE',
        body: JSON.stringify({ id }),
        headers: {
          'content-type': 'application/json',
        },
      }).then((res) => res.json());
    },
    {
      onSuccess: (data, variables) => {
        const dataWithoutDeleted = queryClient
          .getQueryData<URLResponse[]>(['urls'])
          ?.filter((u) => u.id !== variables);
        queryClient.setQueryData(['urls'], dataWithoutDeleted);
      },
    }
  );
}
