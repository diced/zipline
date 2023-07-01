import Layout from '@/components/Layout';
import { Response } from '@/lib/api/response';
import useLogin from '@/lib/hooks/useLogin';
import { LoadingOverlay, Text, Title } from '@mantine/core';
import useSWR from 'swr';

export default function DashboardIndex() {
  const { user, loading } = useLogin();

  const { data: recent, isLoading: recentLoading } = useSWR<Response['/api/user/recent']>('/api/user/recent');
  const { data: total, isLoading: totalLoading } = useSWR<
    Extract<Response['/api/user/files'], { totalCount: number }>
  >('/api/user/files?totalcount=true');

  if (loading) return <LoadingOverlay visible />;

  return (
    <Layout>
      <Title order={1}>
        Welcome back, <b>{user?.username}</b>
      </Title>
      <Text size='sm' color='dimmed'>
        You have <b>{totalLoading ? '...' : total?.totalCount}</b> files uploaded.
      </Text>
    </Layout>
  );
}
