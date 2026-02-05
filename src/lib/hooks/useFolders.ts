import { Response } from '@/lib/api/response';
import { Folder } from '@/lib/db/models/folder';
import useSWR from 'swr';

/**
 * Custom hook to fetch folders with optional user parameter.
 * Uses the noincl=true parameter to fetch folders without file inclusions.
 *
 * @param user - Optional user ID to fetch folders for a specific user
 * @param enabled - Whether the fetch should be enabled (default: true)
 * @returns SWR response with folders data
 */
export function useFolders(user?: string, enabled: boolean = true) {
  const key = enabled ? '/api/user/folders?noincl=true' + (user ? `&user=${user}` : '') : null;

  return useSWR<Extract<Response['/api/user/folders'], Folder[]>>(key);
}
