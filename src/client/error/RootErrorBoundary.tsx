import { useTranslation } from 'react-i18next';
import GenericError from './GenericError';

export default function RootErrorBoundary(props: Record<string, any>) {
  const { t } = useTranslation('layout');

  return (
    <GenericError
      title={t('errors.dashboard.title')}
      message={t('errors.dashboard.message')}
      details={{ ...props, type: 'root' }}
    />
  );
}
