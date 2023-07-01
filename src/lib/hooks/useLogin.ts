import { useRouter } from 'next/router';
import { useEffect } from 'react';
import useSWR from 'swr';
import type { Response } from '../api/response';
import { useUserStore } from '../store/user';

export default function useLogin() {
  const router = useRouter();
  const { data, error, isLoading, mutate } = useSWR<Response['/api/user']>('/api/user');

  const [user, setUser] = useUserStore((state) => [state.user, state.setUser]);
  const [token, setToken] = useUserStore((state) => [state.token, state.setToken]);

  useEffect(() => {
    if (data?.user && data?.token) {
      setUser(data.user);
      setToken(data.token);
    } else if (error) {
      router.push('/auth/login');
    }
  }, [data, error]);

  return { user, token, loading: isLoading || !user, mutate };
}
