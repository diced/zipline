import { useQuery } from '@tanstack/react-query';

export const useVersion = () => {
  return useQuery<{ local: string; upstream: string }>(
    ['version'],
    async () => {
      return fetch('/api/version').then((res) => res.json());
    },
    {
      staleTime: Infinity,
    }
  );
};
