import { useRouter } from 'next/router';

export default function Index() {
  const router = useRouter();
  if (typeof window !== 'undefined') router.push('/dash');
  return null;
}
