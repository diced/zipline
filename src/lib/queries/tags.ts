import { useMutation, useQuery } from '@tanstack/react-query';
import queryClient from 'lib/queries/client';

export type UserTagsResponse = {
  id: string;
  name: string;
  color: string;
  files: {
    id: string;
  }[];
};

export type TagsRequest = {
  id?: string;
  name?: string;
  color?: string;
};

export const useTags = () => {
  return useQuery<UserTagsResponse[]>(['tags'], async () => {
    return fetch('/api/user/tags')
      .then((res) => res.json() as Promise<UserTagsResponse[]>)
      .then((data) => data);
  });
};

export const useFileTags = (id: string) => {
  return useQuery<UserTagsResponse[]>(['tags', id], async () => {
    return fetch(`/api/user/file/${id}/tags`)
      .then((res) => res.json() as Promise<UserTagsResponse[]>)
      .then((data) => data);
  });
};

export const useUpdateFileTags = (id: string) => {
  return useMutation(
    (tags: TagsRequest[]) =>
      fetch(`/api/user/file/${id}/tags`, {
        method: 'POST',
        body: JSON.stringify({ tags }),
        headers: {
          'Content-Type': 'application/json',
        },
      }).then((res) => res.json()),
    {
      onSuccess: () => {
        queryClient.refetchQueries(['tags', id]);
        queryClient.refetchQueries(['files']);
      },
    }
  );
};

export const useDeleteFileTags = (id: string) => {
  return useMutation(
    (tags: string[]) =>
      fetch(`/api/user/file/${id}/tags`, {
        method: 'DELETE',
        body: JSON.stringify({ tags }),
        headers: {
          'Content-Type': 'application/json',
        },
      }).then((res) => res.json()),
    {
      onSuccess: () => {
        queryClient.refetchQueries(['tags', id]);
      },
    }
  );
};

export const useDeleteTags = () => {
  return useMutation(
    (tags: string[]) =>
      fetch('/api/user/tags', {
        method: 'DELETE',
        body: JSON.stringify({ tags }),
        headers: {
          'Content-Type': 'application/json',
        },
      }).then((res) => res.json()),
    {
      onSuccess: () => {
        queryClient.refetchQueries(['tags']);
        queryClient.refetchQueries(['files']);
      },
    }
  );
};

// export const usePaginatedFiles = (page?: number, filter = 'media', favorite = null) => {
//   const queryBuilder = new URLSearchParams({
//     page: Number(page || '1').toString(),
//     filter,
//     ...(favorite !== null && { favorite: favorite.toString() }),
//   });
//   const queryString = queryBuilder.toString();
//
//   return useQuery<UserFilesResponse[]>(['files', queryString], async () => {
//     return fetch('/api/user/paged?' + queryString)
//       .then((res) => res.json() as Promise<UserFilesResponse[]>)
//       .then((data) =>
//         data.map((x) => ({
//           ...x,
//           createdAt: new Date(x.createdAt),
//           expiresAt: x.expiresAt ? new Date(x.expiresAt) : null,
//         }))
//       );
//   });
// };
//
// export const useRecent = (filter?: string) => {
//   return useQuery<UserFilesResponse[]>(['recent', filter], async () => {
//     return fetch(`/api/user/recent?filter=${encodeURIComponent(filter)}`)
//       .then((res) => res.json())
//       .then((data) =>
//         data.map((x) => ({
//           ...x,
//           createdAt: new Date(x.createdAt),
//           expiresAt: x.expiresAt ? new Date(x.expiresAt) : null,
//         }))
//       );
//   });
// };
//
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
//
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
//
// export function invalidateFiles() {
//   return queryClient.invalidateQueries(['files', 'recent', 'stats']);
// }
