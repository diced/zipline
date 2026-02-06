import { Response } from '@/lib/api/response';
import { Folder } from '@/lib/db/models/folder';
import useSWR from 'swr';

export function useFolders(user?: string, enabled: boolean = true) {
  const key = enabled ? '/api/user/folders?noincl=true' + (user ? `&user=${user}` : '') : null;

  return useSWR<Extract<Response['/api/user/folders'], Folder[]>>(key);
}
