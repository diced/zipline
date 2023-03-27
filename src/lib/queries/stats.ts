import { useQuery } from '@tanstack/react-query';

type StatsTypesCount = {
  count: number;
  mimetype: string;
};

export type Stats = {
  created_at: string;
  id: number;
  data: {
    count: number;
    count_by_user: any[];
    count_users: number;
    size: string;
    size_num: number;
    types_count: StatsTypesCount[];
    views_count: number;
  };
};

export const useStats = (amount = 2) => {
  return useQuery<Stats[]>(
    ['stats', amount],
    async () => {
      return fetch('/api/stats?amount=' + amount).then((res) => res.json());
    },
    {
      staleTime: 1000 * 60 * 5, // 5 minutes
    }
  );
};
