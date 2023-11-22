import { useQuery } from '@tanstack/react-query';

export type VersionResponse = {
  isUpstream: boolean;
  update?: boolean;
  updateToType?: keyof VersionResponse['versions'];
  versions: {
    stable: string;
    upstream: string;
    current: string;
  };
};

export const useVersion = () => {
  return useQuery<VersionResponse>(
    ['version'],
    async () => {
      return fetch('/api/version').then((res) => (res.ok ? res.json() : Promise.reject('')));
    },
    {
      refetchInterval: false,
      refetchOnMount: false,
      retry: false,
    },
  );
};
