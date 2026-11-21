import DashboardFileRequests from '@/components/pages/fileRequests';
import { useTitle } from '@/lib/client/hooks/useTitle';
import { useTranslation } from 'react-i18next';

export function Component() {
  const { t } = useTranslation('fileRequests');
  useTitle(t('title'));
  return <DashboardFileRequests />;
}

Component.displayName = 'Dashboard/FileRequests';
