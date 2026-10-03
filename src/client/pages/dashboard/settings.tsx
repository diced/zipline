import DashboardSettings from '@/components/pages/settings';
import { useTitle } from '@/lib/client/hooks/useTitle';
import { useTranslation } from 'react-i18next';

export function Component() {
  const { t } = useTranslation('layout');
  useTitle(t('titles.settings'));

  return <DashboardSettings />;
}

Component.displayName = 'Dashboard/Settings';
