import { useMutation, useQuery } from '@tanstack/react-query';
import queryClient from './client';
import { UserFilesResponse } from './files';

export type UserFoldersResponse = {
  id: number;
  name: string;
  userId: number;
  createdAt: string;
  updatedAt: string;
  files?: UserFilesResponse[];
};

export const useFolders = (query: { [key: string]: string } = {}) => {
  const queryBuilder = new URLSearchParams(query);
  const queryString = queryBuilder.toString();

  return useQuery<UserFoldersResponse[]>(['folders', queryString], async () => {
    return fetch('/api/user/folders?' + queryString)
      .then((res) => res.json() as Promise<UserFoldersResponse[]>)
      .then((data) =>
        data.map((x) => ({
          ...x,
          createdAt: new Date(x.createdAt).toLocaleString(),
          updatedAt: new Date(x.updatedAt).toLocaleString(),
        }))
      );
  });
};

export const useFolder = (id: string, withFiles: boolean = false) => {
  return useQuery<UserFoldersResponse>(['folder', id], async () => {
    return fetch('/api/user/folders/' + id + (withFiles ? '?files=true' : ''))
      .then((res) => res.json() as Promise<UserFoldersResponse>)
      .then((data) => ({
        ...data,
        createdAt: new Date(data.createdAt).toLocaleString(),
        updatedAt: new Date(data.updatedAt).toLocaleString(),
      }));
  });
};

// export function useFileDelete() {
//   // '/api/user/files', 'DELETE', { id: image.id }
//   return useMutation(
//     async (id: string) => {
//       return fetch('/api/user/files', {
//         method: 'DELETE',
//         body: JSON.stringify({ id }),
//         headers: {
//           'content-type': 'application/json',
//         },
//       }).then((res) => res.json());
//     },
//     {
//       onSuccess: () => {
//         queryClient.refetchQueries(['files']);
//       },
//     }
//   );
// }

// export function useFileFavorite() {
//   // /api/user/files', 'PATCH', { id: image.id, favorite: !image.favorite }
//   return useMutation(
//     async (data: { id: string; favorite: boolean }) => {
//       return fetch('/api/user/files', {
//         method: 'PATCH',
//         body: JSON.stringify(data),
//         headers: {
//           'content-type': 'application/json',
//         },
//       }).then((res) => res.json());
//     },
//     {
//       onSuccess: () => {
//         queryClient.refetchQueries(['files']);
//       },
//     }
//   );
// }

export function invalidateFolders() {
  return queryClient.invalidateQueries(['folders']);
}
