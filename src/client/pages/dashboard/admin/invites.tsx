import DashboardInvites from '@/components/pages/invites';
import { useTitle } from '@/lib/client/hooks/useTitle';
import { useTranslation } from 'react-i18next';

export function Component() {
  const { t } = useTranslation('layout');
  useTitle(t('titles.invites'));

  return <DashboardInvites />;
}

Component.displayName = 'Dashboard/Admin/Invites';
