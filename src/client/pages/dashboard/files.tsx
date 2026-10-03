import DashboardFiles from '@/components/pages/files';
import { useTitle } from '@/lib/client/hooks/useTitle';
import { useTranslation } from 'react-i18next';

export function Component() {
  const { t } = useTranslation('layout');
  useTitle(t('titles.files'));

  return <DashboardFiles />;
}

Component.displayName = 'Dashboard/Files';
