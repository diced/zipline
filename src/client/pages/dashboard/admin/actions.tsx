import DashboardServerActions from '@/components/pages/serverActions';
import { useTitle } from '@/lib/client/hooks/useTitle';
import { useTranslation } from 'react-i18next';

export function Component() {
  const { t } = useTranslation('layout');
  useTitle(t('titles.serverActions'));

  return <DashboardServerActions />;
}

Component.displayName = 'Dashboard/Admin/Actions';
