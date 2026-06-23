import DashboardAdminHome from '@/components/pages/admin';
import { useTitle } from '@/lib/client/hooks/useTitle';

export function Component() {
  useTitle('Administrator');

  return <DashboardAdminHome />;
}

Component.displayName = 'Dashboard/Admin';
