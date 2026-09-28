import DashboardAdminHome from '@/components/pages/admin';
import { useTitle } from '@/lib/client/hooks/useTitle';
import { useTranslation } from 'react-i18next';

export function Component() {
  const { t } = useTranslation('layout');
  useTitle(t('titles.administrator'));

  return <DashboardAdminHome />;
}

Component.displayName = 'Dashboard/Admin';
