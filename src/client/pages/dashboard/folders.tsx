import DashboardFolders from '@/components/pages/folders';
import { useTitle } from '@/lib/client/hooks/useTitle';
import { useTranslation } from 'react-i18next';

export function Component() {
  const { t } = useTranslation('layout');
  useTitle(t('titles.folders'));

  return <DashboardFolders />;
}

Component.displayName = 'Dashboard/Folders';
