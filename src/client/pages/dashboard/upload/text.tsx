import UploadText from '@/components/pages/upload/Text';
import { useTitle } from '@/lib/client/hooks/useTitle';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';

export function Component() {
  const { t } = useTranslation('layout');
  const location = useLocation();
  const navigate = useNavigate();
  const pastedText = typeof location.state?.pastedText === 'string' ? location.state.pastedText : undefined;
  useTitle(t('titles.uploadText'));

  useEffect(() => {
    if (pastedText === undefined) return;

    navigate(location.pathname + location.search + location.hash, { replace: true, state: null });
  }, [pastedText, location.pathname, location.search, location.hash, navigate]);

  return <UploadText initialText={pastedText} />;
}

Component.displayName = 'Dashboard/Upload/Text';
