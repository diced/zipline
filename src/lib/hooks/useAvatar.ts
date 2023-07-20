import useSWR from 'swr';

const f = async () => {
  const res = await fetch('/api/user/avatar');
  if (!res.ok) return null;

  const r = await res.text();
  return r;
};

export default function useAvatar() {
  const { data, mutate } = useSWR('/api/user/avatar', f);
  return { avatar: data, mutate };
}
