import DashboardURLs from '@/components/pages/urls';
import { useTitle } from '@/lib/client/hooks/useTitle';
import { useTranslation } from 'react-i18next';

export function Component() {
  const { t } = useTranslation('layout');
  useTitle(t('titles.urls'));

  return <DashboardURLs />;
}

Component.displayName = 'Dashboard/URLs';
