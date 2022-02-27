import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { updateUser, User } from 'lib/redux/reducers/user';
import { useStoreDispatch, useStoreSelector } from 'lib/redux/store';
import useFetch from './useFetch';

export default function login() {
  const router = useRouter();
  const dispatch = useStoreDispatch();
  const userState = useStoreSelector(s => s.user);

  const [user, setUser] = useState<User>(userState);
  const [loading, setLoading] = useState(!userState);

  async function load() {
    setLoading(true);
    
    const res = await useFetch('/api/user');
    if (res.error) return router.push('/auth/login?url=' + router.route);

    dispatch(updateUser(res));
    setUser(res);
    setLoading(false);
  }

  useEffect(() => {
    if (!loading && user) return;
    load();
  }, []);

  return { loading, user };
}