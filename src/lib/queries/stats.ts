import { useQuery } from '@tanstack/react-query';


/**
 * count: 0
count_by_user: []
count_users: 1
size: "0.0 B"
size_num: 0
types_count: []
views_count: 0
 */

type Stats = {
  count: number;
  count_by_user: any[];
  count_users: number;
  size: string;
  size_num: number;
  types_count: any[];
  views_count: number;
}

export const useStats = () => {
  return useQuery<Stats>(['stats'], async () => {
    return fetch('/api/stats')
      .then(res => res.json());
  });
};