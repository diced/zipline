import { useQuery } from '@tanstack/react-query';

export type UserFilesResponse = {
  created_at: string;
  expires_at?: string;
  file: string;
  mimetype: string;
  id: string;
  favorite: boolean;
  url: string;
}

export const useFiles = () => {
  return useQuery<UserFilesResponse[]>(['files'], async () => {
    return fetch('/api/user/files')
      .then(res => res.json())
      .then(data => data.map(x => ({ 
        ...x, 
        created_at: new Date(x.created_at).toLocaleString(),
      })));
  });
};