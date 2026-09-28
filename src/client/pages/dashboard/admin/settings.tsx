import DashboardServerSettings from '@/components/pages/serverSettings';
import { useTitle } from '@/lib/client/hooks/useTitle';
import { useTranslation } from 'react-i18next';

export function Component() {
  const { t } = useTranslation('layout');
  useTitle(t('titles.serverSettings'));

  return <DashboardServerSettings />;
}

Component.displayName = 'Dashboard/Admin/Settings';
