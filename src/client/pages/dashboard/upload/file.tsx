import UploadFile from '@/components/pages/upload/File';
import { useTitle } from '@/lib/client/hooks/useTitle';
import { useTranslation } from 'react-i18next';

export function Component() {
  const { t } = useTranslation('layout');
  useTitle(t('titles.uploadFile'));

  return <UploadFile />;
}

Component.displayName = 'Dashboard/Upload/File';
