import { useTranslation } from 'react-i18next';
import { useRouteError } from 'react-router-dom';
import GenericError from './GenericError';
import ReloadPage from './ReloadPage';

export default function DashboardErrorBoundary(props: Record<string, any>) {
  const { t } = useTranslation('layout');
  const error = useRouteError();
  if (error instanceof Error && error.message.startsWith('Failed to fetch dynamically imported module:')) {
    return <ReloadPage />;
  }

  return (
    <GenericError
      title={t('errors.dashboard.title')}
      message={t('errors.dashboard.message')}
      details={{ ...props, type: 'dashboard' }}
    />
  );
}
