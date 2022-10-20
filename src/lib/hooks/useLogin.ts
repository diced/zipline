import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { userSelector } from 'lib/recoil/user';
import { useRecoilState } from 'recoil';
import useFetch from './useFetch';

export default function login() {
  const router = useRouter();
  const [user, setUser] = useRecoilState(userSelector);
  const [loading, setLoading] = useState(!user);

  async function load() {
    setLoading(true);

    const res = await useFetch('/api/user');
    if (res.error) {
      if (res.error === 'oauth token expired') return router.push(res.redirect_uri);

      return router.push('/auth/login?url=' + router.route);
    }

    setUser(res);
    setLoading(false);
  }

  useEffect(() => {
    if (!loading && user) return;
    load();
  }, []);

  return { loading };
}
