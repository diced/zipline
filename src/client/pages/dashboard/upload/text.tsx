import UploadText from '@/components/pages/upload/Text';
import { useTitle } from '@/lib/client/hooks/useTitle';
import { useTranslation } from 'react-i18next';

export function Component() {
  const { t } = useTranslation('layout');
  useTitle(t('titles.uploadText'));

  return <UploadText />;
}

Component.displayName = 'Dashboard/Upload/Text';
