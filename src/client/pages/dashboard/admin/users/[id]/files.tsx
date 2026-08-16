import ViewUserFiles from '@/components/pages/users/ViewUserFiles';
import { useTitle } from '@/lib/client/hooks/useTitle';
import { Params, redirect, useLoaderData } from 'react-router-dom';

export async function loader({ params }: { params: Params<string> }) {
  const res = await fetch('/api/users/' + params.id);
  if (!res.ok) {
    return redirect('/dashboard/admin/users');
  }

  const user = await res.json();
  return { user };
}

export function Component() {
  const { user } = useLoaderData<typeof loader>();
  useTitle(`${user ? user.username : 'User'}'s files`);

  return <ViewUserFiles />;
}

Component.displayName = 'DashboardAdminViewUserFiles';
