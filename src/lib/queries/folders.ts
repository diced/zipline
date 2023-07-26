import { useQuery } from '@tanstack/react-query';
import queryClient from './client';
import { UserFilesResponse } from './files';

export type UserFoldersResponse = {
  id: number;
  name: string;
  userId: number;
  createdAt: string;
  updatedAt: string;
  public: boolean;
  files?: UserFilesResponse[];
};

export const useFolders = (query: { [key: string]: string } = {}) => {
  const queryBuilder = new URLSearchParams(query);
  const queryString = queryBuilder.toString();

  return useQuery<UserFoldersResponse[]>(['folders', queryString], async () => {
    return fetch('/api/user/folders?' + queryString).then(
      (res) => res.json() as Promise<UserFoldersResponse[]>
    );
  });
};

export const useFolder = (id: string, withFiles = false) => {
  return useQuery<UserFoldersResponse>(['folder', id], async () => {
    return fetch('/api/user/folders/' + id + (withFiles ? '?files=true' : '')).then(
      (res) => res.json() as Promise<UserFoldersResponse>
    );
  });
};

export function invalidateFolders() {
  return queryClient.invalidateQueries(['folders']);
}
