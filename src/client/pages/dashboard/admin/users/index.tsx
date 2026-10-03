import DashboardUsers from '@/components/pages/users';
import { useTitle } from '@/lib/client/hooks/useTitle';
import { useTranslation } from 'react-i18next';

export function Component() {
  const { t } = useTranslation('layout');
  useTitle(t('titles.users'));

  return <DashboardUsers />;
}

Component.displayName = 'Dashboard/Admin/Users';
