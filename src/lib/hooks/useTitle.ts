import { useEffect } from 'react';
import useSWR from 'swr';
import { Response } from '../api/response';
import { useLocation } from 'react-router-dom';

export function useTitle(title?: string) {
  const location = useLocation();
  const { data, error, isLoading } = useSWR<Response['/api/server/public']>('/api/server/public');

  useEffect(() => {
    if (!data || error || isLoading) return;
    document.title = title ? `${data.website.title} – ${title}` : data.website.title || 'Zipline';
  }, [title, location, data, isLoading]);
}
